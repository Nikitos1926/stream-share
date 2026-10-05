#!/usr/bin/env python3
"""Estimate printed pages per chapter file against thesis/PLAN.md §2 budgets.

pages ≈ prose_words / 240 + figures * 0.6 + table_rows * 1.3 / 29 + code_lines / 60
(240 words per full text page measured in the two 100-point examples; TNR 14, 1.5 spacing).
Usage: wordcount.py chapters/*.md
"""
import re
import sys
from pathlib import Path

WORDS_PER_PAGE = 240
FIGURE_PAGES = 0.6
LINES_PER_PAGE = 29
CODE_LINES_PER_PAGE = 60
PLACEHOLDER = re.compile(r"\[ПОТРЕБУЄ УТОЧНЕННЯ:[^\]]*\]")


def estimate(text: str) -> tuple[float, int]:
    pages, words, rows, code, in_code = 0.0, 0, 0, 0, False
    for line in text.splitlines():
        if line.lstrip().startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            code += 1
        elif line.lstrip().startswith("|"):
            rows += 1
        elif line.lstrip().startswith("!["):
            pages += FIGURE_PAGES
        else:
            words += len(re.findall(r"\w+", line))
    pages += words / WORDS_PER_PAGE + rows * 1.3 / LINES_PER_PAGE + code / CODE_LINES_PER_PAGE
    return pages, len(PLACEHOLDER.findall(text))


def main(paths: list[str]) -> None:
    total = 0.0
    for p in paths:
        pages, todo = estimate(Path(p).read_text(encoding="utf-8"))
        total += pages
        print(f"{Path(p).name:28s} {pages:6.1f} pp  {todo:3d} × ПОТРЕБУЄ УТОЧНЕННЯ")
    print(f"{'total':28s} {total:6.1f} pp  (main text target 60–80, see PLAN.md §2)")


if __name__ == "__main__":
    main(sys.argv[1:])
