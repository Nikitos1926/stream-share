#!/usr/bin/env bash
# thesis.docx -> thesis.pdf with headless LibreOffice (ЗМІСТ and page fields filled), plus the real
# page counts per section (PLAN.md §2). Called by `build.sh --pdf`; usage: pdf.sh IN.docx OUT.pdf
#
# The sandbox has no LibreOffice and no root, so this fetches the official LibreOffice .deb bundle
# (sha256-pinned) and the Debian runtime libraries it needs (apt-get download, no install) into
# thesis/.cache/libreoffice and runs it from there. On a machine with LibreOffice installed set
# SOFFICE=/path/to/soffice.bin and LO_PYTHON=/path/to/its/python (or a python with `uno`).
# The PDF is a preview with Liberation fonts (metric-compatible with Times New Roman / Courier New);
# the submitted original is exported to PDF/A from Word by the author (Gap G10).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
THESIS="$(dirname "$HERE")"
CACHE="$THESIS/.cache"
LO="$CACHE/libreoffice"
IN="$(realpath "$1")"; OUT="$(realpath -m "$2")"

LO_VERSION=26.8.1
case "$(uname -m)" in
  aarch64) LO_ARCH=aarch64; LO_SHA256=1b069c20dd237f6decad3ea02cb02f39fdf458b03d09c2a9facb7b9b71e6a27a ;;
  x86_64)  LO_ARCH=x86-64;  LO_SHA256=30903df3b9f61360d9660cd707de48cd2831469114492a5008ed58a0ac77d044 ;;
  *) echo "pdf.sh: unsupported architecture $(uname -m)" >&2; exit 1 ;;
esac
LO_DIR="${LO_ARCH/x86-64/x86_64}"
LO_URL="https://download.documentfoundation.org/libreoffice/stable/$LO_VERSION/deb/$LO_DIR/LibreOffice_${LO_VERSION}_Linux_${LO_ARCH}_deb.tar.gz"
# Runtime libraries soffice.bin links against that a slim Debian image lacks (+ dependencies).
LIBS=(libx11-6 libx11-xcb1 libxext6 libxinerama1 libxrandr2 libcairo2 libcups2t64 libdbus-1-3
      libfontconfig1 libfreetype6 libglib2.0-0t64 libnspr4 libnss3 libxml2)

if [[ -z "${SOFFICE:-}" ]]; then
  mkdir -p "$LO"
  if [[ ! -x "$LO/root/opt/libreoffice${LO_VERSION%.*}/program/soffice.bin" ]]; then
    tarball="$LO/lo-$LO_VERSION.tar.gz"
    [[ -f "$tarball" ]] || { curl -fsSL "$LO_URL" -o "$tarball.tmp" && mv "$tarball.tmp" "$tarball"; }
    echo "$LO_SHA256  $tarball" | sha256sum -c --quiet - || { rm -f "$tarball"; echo "checksum mismatch: $tarball" >&2; exit 1; }
    rm -rf "$LO/unpack" && mkdir -p "$LO/unpack" && tar -xzf "$tarball" -C "$LO/unpack"
    for d in "$LO"/unpack/*/DEBS/*.deb; do dpkg-deb -x "$d" "$LO/root"; done
    rm -rf "$LO/unpack"
  fi
  if [[ ! -f "$LO/libs.done" ]]; then
    # Debian packages from the image's own apt sources, downloaded without root.
    A="$LO/apt"; mkdir -p "$A/lists/partial" "$A/cache/archives/partial" "$A/debs"
    O=(-o "Dir::State::Lists=$A/lists" -o "Dir::Cache=$A/cache" -o Debug::NoLocking=1)
    apt-get "${O[@]}" update -qq >/dev/null 2>&1  # the image's docker-clean hook warns without root
    mapfile -t pkgs < <(apt-get "${O[@]}" -s install --no-install-recommends "${LIBS[@]}" 2>/dev/null \
                        | awk '/^Inst/{print $2}')
    if (( ${#pkgs[@]} )); then
      (cd "$A/debs" && apt-get "${O[@]}" download "${pkgs[@]}" >/dev/null)
      for d in "$A"/debs/*.deb; do dpkg-deb -x "$d" "$LO/root"; done
    fi
    touch "$LO/libs.done"
  fi
  PROGRAM="$LO/root/opt/libreoffice${LO_VERSION%.*}/program"
  SOFFICE="$PROGRAM/soffice.bin"
  LO_PYTHON="${LO_PYTHON:-$PROGRAM/python}"
  export LD_LIBRARY_PATH="$LO/root/usr/lib/$(uname -m)-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
fi

# Fonts: Liberation (fetched by build.sh) stands in for Times New Roman / Courier New / Arial.
FONTDIR="$CACHE/liberation-fonts-ttf-2.1.5"
cat > "$CACHE/fonts.conf" <<EOF
<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig><dir>$FONTDIR</dir><include ignore_missing="yes">/etc/fonts/fonts.conf</include>
<cachedir>$CACHE/fontconfig</cachedir>
<alias binding="same"><family>Times New Roman</family><prefer><family>Liberation Serif</family></prefer></alias>
<alias binding="same"><family>Courier New</family><prefer><family>Liberation Mono</family></prefer></alias>
<alias binding="same"><family>Arial</family><prefer><family>Liberation Sans</family></prefer></alias>
</fontconfig>
EOF
export FONTCONFIG_FILE="$CACHE/fonts.conf" SAL_USE_VCLPLUGIN=svp SOFFICE LO_PROFILE="$CACHE/lo-profile"
"${LO_PYTHON:-python3}" "$HERE/topdf.py" "$IN" "$OUT"
