#!/usr/bin/env bash
# Thesis build: PlantUML -> PNG, Markdown chapters -> DOCX (pandoc + reference.docx + Lua filter).
# Usage (from repo root, branch `diploma`):  mise install && bash thesis/tools/build.sh [--diagrams-only|--test|--pdf]
# Output: thesis/out/thesis.docx (+ page estimate printed by wordcount.py).
#   --diagrams-only  render diagrams/*.puml and diagrams/*.py only
#   --test           build tools/fixture/sample.md -> out/fixture.docx and check it (check_docx.py)
#   --pdf            also out/thesis.pdf via LibreOffice (tools/pdf.sh) with real page counts
#   --release        strict build + PDF, copied to thesis/final/ (committed deliverable)
# Every full build runs tools/qa.py (numbering, references, listing length) and regenerates
# thesis/OPEN_ITEMS.md from the [ПОТРЕБУЄ …] placeholders.
# THESIS_STRICT=1 turns unknown cross-references into errors (use for the final build).
# See thesis/PLAN.md §4 and thesis/CLAUDE.md «Build».
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

# --- Python deps (python-docx, PyYAML, matplotlib) in a private venv: the sandbox sets PIP_USER=1 ---
VENV="$CACHE/venv"
REQ="$HERE/requirements.txt"
if [[ ! -x "$VENV/bin/python" ]] || ! cmp -s "$REQ" "$VENV/requirements.txt"; then
  python3 -m venv "$VENV"
  PIP_USER=0 "$VENV/bin/pip" install -q --disable-pip-version-check -r "$REQ"
  cp "$REQ" "$VENV/requirements.txt"
fi
PY="$VENV/bin/python"

shopt -s nullglob
pumls=("$THESIS"/diagrams/*.puml)
if (( ${#pumls[@]} )); then
  # Each .puml must start with `!pragma layout smetana` (no Graphviz) — see thesis/CLAUDE.md.
  java -Djava.awt.headless=true -Dsun.awt.fontconfig="$FC" -jar "$CACHE/plantuml.jar" \
    -tpng -charset UTF-8 -failfast2 "${pumls[@]}"
  echo "rendered ${#pumls[@]} diagram(s)"
fi
# Charts PlantUML cannot lay out (fig-gantt: table-style Gantt after example 1) are matplotlib
# scripts diagrams/fig-*.py, rendered to the PNG next to them with the Liberation fonts.
for py in "$THESIS"/diagrams/*.py; do "$PY" "$py" "$FONTDIR"; done
[[ "${1:-}" == "--diagrams-only" ]] && exit 0
[[ "${1:-}" == "--release" ]] && export THESIS_STRICT=1

# --- reference.docx (styles from PLAN.md §1) ---
"$PY" "$HERE/make_reference_docx.py" "$OUT/reference.docx"

# --- Markdown -> DOCX: pandoc + thesis.lua (numbering, cross-refs, sources), then assemble.py
# (title page, ЗМІСТ field, header page numbers). Run from the Markdown's directory: image paths
# are relative to it (chapters use ../diagrams/x.png).
build_docx() { # workdir out.docx extra-pandoc-args... -- files...
  local dir="$1" out="$2"; shift 2
  local args=() files=()
  while [[ "$1" != "--" ]]; do args+=("$1"); shift; done; shift
  files=("$@")
  (
    cd "$dir"
    pandoc "${files[@]}" \
      --from markdown+fenced_divs+link_attributes+pipe_tables+tex_math_dollars \
      --to docx --reference-doc "$OUT/reference.docx" \
      --metadata-file "$THESIS/metadata.yaml" \
      --lua-filter "$HERE/thesis.lua" "${args[@]}" -o "$out.pandoc.docx"
  )
  "$PY" "$HERE/assemble.py" "$out.pandoc.docx" "$out" --metadata "$THESIS/metadata.yaml"
  rm -f "$out.pandoc.docx"
}

if [[ "${1:-}" == "--test" ]]; then
  build_docx "$HERE/fixture" "$OUT/fixture.docx" -M thesis-unused-ok=true -- sample.md
  "$PY" "$HERE/check_docx.py" "$OUT/fixture.docx"
  exit 0
fi

chapters=("$THESIS"/chapters/*.md)
if (( ! ${#chapters[@]} )); then echo "no chapters yet"; exit 0; fi
build_docx "$THESIS/chapters" "$OUT/thesis.docx" -- "${chapters[@]}"
python3 "$HERE/wordcount.py" "${chapters[@]}"
python3 "$HERE/qa.py" --open-items "$THESIS/OPEN_ITEMS.md"
# strict builds also fail on a stale source list (citation order changed without re-running references.py)
[[ "${THESIS_STRICT:-}" == "1" ]] && python3 "$HERE/references.py" --check
echo "built $OUT/thesis.docx — open in Word, Ctrl+A, F9 to fill ЗМІСТ and page numbers"
if [[ "${1:-}" == "--pdf" || "${1:-}" == "--release" ]]; then
  bash "$HERE/pdf.sh" "$OUT/thesis.docx" "$OUT/thesis.pdf" | tee "$OUT/pages.txt"
fi
if [[ "${1:-}" == "--release" ]]; then
  mkdir -p "$THESIS/final"
  cp "$OUT/thesis.docx" "$OUT/thesis.pdf" "$OUT/pages.txt" "$THESIS/final/"
  echo "release copied to $THESIS/final/"
fi
