#!/usr/bin/env python3
"""Final-assembly quality checks for the thesis sources (PLAN.md §1, §3; ticket «Thesis assembly»).

Checks the Markdown in chapters/ (lexical order = document order):
  * every numbered object (fig/tbl/lst/eq/sc) is defined once and referenced in the text,
    and its first reference comes before the object itself (thesis/CLAUDE.md);
  * every referenced ID exists;
  * every image file exists;
  * listings in the main text are ≤ 25 lines (appendices exempt).
Collects every «[ПОТРЕБУЄ …]» placeholder (metadata.yaml, chapters, front/) with the nearest heading into OPEN_ITEMS.md
with --open-items.

Usage: qa.py [--open-items thesis/OPEN_ITEMS.md]      exit 1 on an error, warnings only print.
"""
import re
import sys
from pathlib import Path

THESIS = Path(__file__).resolve().parent.parent
PREFIXES = ("fig", "tbl", "lst", "eq", "sc")
DEF = re.compile(r"\{#((?:%s):[\w-]+)" % "|".join(PREFIXES))
REF = re.compile(r"(?<![\w#{])@((?:%s):[\w-]+[\w])" % "|".join(PREFIXES))
RANGE = re.compile(r"@((?:%s):[\w-]*\w)\s*[–-]\s*@((?:%s):[\w-]*\w)" % (("|".join(PREFIXES),) * 2))
IMG = re.compile(r"!\[[^\]]*\]\(([^)\s]+)")
PLACEHOLDER = re.compile(r"\[ПОТРЕБУЄ[^\]]*\]", re.S)
HEADING = re.compile(r"^(#+\s+.+|\*\*\d+(?:\.\d+)+ [^*]+\*\*)")
YAML_KEY = re.compile(r"^(\w+):")


def context_of(lines: list[str], idx: int, yaml: bool, form: bool = False) -> str:
    """Nearest heading / run-in point above line idx (Markdown) or the key (metadata.yaml); in
    the task form (no headings) the table row's stage or the field label of the line."""
    if form:
        line = lines[idx].strip()
        cells = [c.strip() for c in line.strip("|").split("|")] if line.startswith("|") else []
        label = cells[1] if len(cells) > 2 else line.split(":")[0] if ":" in line.split("[")[0] else ""
        label = re.sub(r"\[ПОТРЕБУЄ[^\]]*\]?|[\\_*]", "", label).strip()
        return (label[:70] + "…") if len(label) > 70 else label or "—"
    for k in range(idx, -1, -1):
        m = (YAML_KEY if yaml else HEADING).match(lines[k])
        if m:
            return m.group(1).strip("#* ").rstrip(".")
    return "—"


def main(argv: list[str]) -> int:
    chapters = sorted((THESIS / "chapters").glob("*.md"))
    errors, warnings = [], []
    defs: dict[str, tuple[str, int, int]] = {}  # id -> (file, line, order)
    refs: dict[str, list[tuple[str, int, int]]] = {}
    ranges: list[tuple[str, str, tuple[str, int, int]]] = []  # «@tbl:a–@tbl:c» covers tbl:b too
    order = 0
    for path in chapters:
        in_code = False
        appendix = path.name.startswith("A")
        lst_start = None
        for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            order += 1
            if line.lstrip().startswith("```"):
                if not in_code:
                    lst_start = (n, DEF.search(line))
                elif lst_start and lst_start[1] and not appendix and n - lst_start[0] - 1 > 25:
                    errors.append(f"{path.name}:{lst_start[0]}: listing {lst_start[1].group(1)} "
                                  f"has {n - lst_start[0] - 1} lines (> 25)")
                in_code = not in_code
                if in_code:
                    for m in DEF.finditer(line):
                        defs.setdefault(m.group(1), (path.name, n, order))
                continue
            if in_code:
                continue
            for m in DEF.finditer(line):
                if m.group(1) in defs:
                    errors.append(f"{path.name}:{n}: duplicate id {m.group(1)}")
                defs.setdefault(m.group(1), (path.name, n, order))
            for m in REF.finditer(line):
                refs.setdefault(m.group(1), []).append((path.name, n, order))
            for m in RANGE.finditer(line):
                ranges.append((m.group(1), m.group(2), (path.name, n, order)))
            for m in IMG.finditer(line):
                if not (path.parent / m.group(1)).is_file():
                    errors.append(f"{path.name}:{n}: missing image {m.group(1)}")
    for first, last, where in ranges:
        if first in defs and last in defs:
            lo, hi = defs[first][2], defs[last][2]
            for key, (_, _, o) in defs.items():
                if key.split(":")[0] == first.split(":")[0] and lo < o < hi:
                    refs.setdefault(key, []).append(where)
    for key, (f, n, o) in defs.items():
        if key not in refs:
            errors.append(f"{f}:{n}: {key} is never referenced in the text")
        elif min(r[2] for r in refs[key]) > o:
            r = min(refs[key], key=lambda x: x[2])
            warnings.append(f"{f}:{n}: {key} first referenced after it appears ({r[0]}:{r[1]})")
    for key, places in refs.items():
        if key not in defs:
            f, n, _ = places[0]
            errors.append(f"{f}:{n}: reference to unknown {key}")

    counts = {p: sum(1 for k in defs if k.startswith(p + ":")) for p in PREFIXES}
    print("numbered objects: " + ", ".join(f"{p} {c}" for p, c in counts.items()))
    for w in warnings:
        print("warning:", w)
    for e in errors:
        print("error:", e)

    if "--open-items" in argv:
        out = Path(argv[argv.index("--open-items") + 1])
        write_open_items(out, chapters)
    return 1 if errors else 0


def write_open_items(out: Path, chapters: list[Path]) -> None:
    files = [THESIS / "metadata.yaml", *chapters, *sorted((THESIS / "front").glob("*.md"))]
    rows = []
    for path in files:
        text = path.read_text(encoding="utf-8")
        lines = text.splitlines()
        yaml = path.suffix == ".yaml"
        comments = [(c.start(), c.end()) for c in re.finditer(r"<!--.*?-->", text, re.S)]
        for m in PLACEHOLDER.finditer(text):
            if any(a <= m.start() < b for a, b in comments):
                continue
            line = text.count("\n", 0, m.start()) + 1
            if yaml and lines[line - 1].lstrip().startswith("#"):
                continue
            body = " ".join(m.group(0)[1:-1].split())
            body = re.sub(r"^ПОТРЕБУЄ\s+\S+?:\s*", "", body)
            rel = path.relative_to(THESIS).as_posix()
            where = context_of(lines, line - 1, yaml, rel.startswith("front/")).replace("|", "\\|")
            rows.append((rel, line, where, body.replace("|", "\\|")))
    lines = [
        "# Відкриті питання до автора (OPEN_ITEMS)",
        "",
        "Generated by `python3 thesis/tools/qa.py --open-items thesis/OPEN_ITEMS.md` — do not edit by hand;",
        "replace the placeholder in the source file, rebuild, and regenerate this list.",
        "Every item is a `[ПОТРЕБУЄ …]` placeholder: data only the author can provide (PLAN.md §5, gaps",
        "G1–G11). `front/task-sheet.md` is the separate task form, not part of thesis.docx.",
        "",
        "Final steps outside the sources (G10): open `thesis/out/thesis.docx` in Word, Ctrl+A → F9",
        "(ЗМІСТ, page numbers), add «Продовження таблиці» labels to tables split across pages, update",
        "the volume sentence of both abstracts with the final page counts, export PDF/A with Times New",
        "Roman embedded, sign with КЕП, get the bibliographic description at https://bo.op.edu.ua.",
        "Screenshots in `screenshots/` are labelled stub images: replace each file with a real one.",
        "Measured volume for the abstracts' volume sentence: `thesis/final/pages.txt` (`build.sh --release`).",
        "",
    ]
    per_file: dict[str, int] = {}
    for r in rows:
        per_file[r[0]] = per_file.get(r[0], 0) + 1
    lines.append(f"Total placeholders: **{len(rows)}** — "
                 + ", ".join(f"`{f}` {c}" for f, c in per_file.items()) + ".")
    current = None
    for rel, line, where, body in rows:
        if rel != current:
            current = rel
            lines += ["", f"## {rel}", "", "| Рядок | Де | Що потрібно |", "| --- | --- | --- |"]
        lines.append(f"| {line} | {where} | {body} |")
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {out} ({len(rows)} placeholders)")


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
