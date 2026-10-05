#!/usr/bin/env bash
# Thesis build: PlantUML -> PNG, Markdown chapters -> DOCX (pandoc + reference.docx + Lua filter).
# Usage (from repo root, branch `diploma`):  mise install && bash thesis/tools/build.sh [--diagrams-only]
# Output: thesis/out/thesis.docx (+ page estimate printed by wordcount.py).
# See thesis/PLAN.md §4. The Lua filter and assemble.py are TODO for the toolchain ticket.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
THESIS="$(dirname "$HERE")"
CACHE="$THESIS/.cache"
OUT="$THESIS/out"
mkdir -p "$CACHE" "$OUT"

PLANTUML_VERSION=1.2026.8
PLANTUML_URL="https://github.com/plantuml/plantuml/releases/download/v${PLANTUML_VERSION}/plantuml-${PLANTUML_VERSION}.jar"
PLANTUML_SHA256=5e1ecfa8ecd32c90b03bbf3b1eb6f020943f98ab0fcf4032be31a0002ee2c462
FONTS_URL="https://github.com/liberationfonts/liberation-fonts/files/7261482/liberation-fonts-ttf-2.1.5.tar.gz"
FONTS_SHA256=7191c669bf38899f73a2094ed00f7b800553364f90e2637010a69c0e268f25d0

fetch() { # url sha256 dest
  if [[ ! -f "$3" ]]; then curl -fsSL "$1" -o "$3.tmp" && mv "$3.tmp" "$3"; fi
  echo "$2  $3" | sha256sum -c --quiet - || { rm -f "$3"; echo "checksum mismatch: $3" >&2; exit 1; }
}

# --- PlantUML + fonts (headless containers have no fonts/fontconfig; no Graphviz -> smetana) ---
fetch "$PLANTUML_URL" "$PLANTUML_SHA256" "$CACHE/plantuml.jar"
fetch "$FONTS_URL" "$FONTS_SHA256" "$CACHE/fonts.tar.gz"
FONTDIR="$CACHE/liberation-fonts-ttf-2.1.5"
[[ -d "$FONTDIR" ]] || tar -xzf "$CACHE/fonts.tar.gz" -C "$CACHE"

FC="$CACHE/fontconfig.properties"
{
  echo "version=1"
  echo "sequence.allfonts=default"
  for logical in serif:Serif sansserif:Sans monospaced:Mono dialog:Sans dialoginput:Mono; do
    l="${logical%%:*}"; fam="Liberation ${logical##*:}"
    echo "$l.plain.default=$fam"
    echo "$l.bold.default=$fam Bold"
    echo "$l.italic.default=$fam Italic"
    echo "$l.bolditalic.default=$fam Bold Italic"
  done
  for f in "$FONTDIR"/*.ttf; do
    face="$(basename "$f" .ttf)"            # e.g. LiberationSerif-BoldItalic
    fam="${face%%-*}"; style="${face#*-}"   # LiberationSerif / BoldItalic
    name="Liberation ${fam#Liberation}"
    case "$style" in
      Regular) ;; Bold) name="$name Bold" ;; Italic) name="$name Italic" ;; BoldItalic) name="$name Bold Italic" ;;
    esac
    echo "filename.${name// /_}=$f"
  done
} > "$FC"

shopt -s nullglob
pumls=("$THESIS"/diagrams/*.puml)
if (( ${#pumls[@]} )); then
  # Each .puml must start with `!pragma layout smetana` (no Graphviz) — see thesis/CLAUDE.md.
  java -Djava.awt.headless=true -Dsun.awt.fontconfig="$FC" -jar "$CACHE/plantuml.jar" \
    -tpng -charset UTF-8 -failfast2 "${pumls[@]}"
  echo "rendered ${#pumls[@]} diagram(s)"
fi
[[ "${1:-}" == "--diagrams-only" ]] && exit 0

# --- reference.docx (styles from PLAN.md §1) ---
python3 "$HERE/make_reference_docx.py" "$OUT/reference.docx"

# --- Markdown -> DOCX ---
chapters=("$THESIS"/chapters/*.md)
if (( ! ${#chapters[@]} )); then echo "no chapters yet"; exit 0; fi
filter=()
[[ -f "$HERE/thesis.lua" ]] && filter=(--lua-filter "$HERE/thesis.lua")
(
  cd "$THESIS/chapters"  # image paths in chapters are relative: ../diagrams/x.png
  pandoc "${chapters[@]}" \
    --from markdown+fenced_divs+link_attributes+pipe_tables+tex_math_dollars \
    --to docx --reference-doc "$OUT/reference.docx" \
    --metadata-file "$THESIS/metadata.yaml" \
    "${filter[@]}" -o "$OUT/thesis.docx"
)
# TODO(toolchain ticket): python3 "$HERE/assemble.py" — title page, header PAGE field, TOC.
python3 "$HERE/wordcount.py" "${chapters[@]}"
echo "built $OUT/thesis.docx"
