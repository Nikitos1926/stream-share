# thesis/ — rules for agents writing the diploma thesis

Branch `diploma` only; ticket branches are cut from `diploma`, PRs target `diploma`, never `main`.
`thesis/PLAN.md` is binding: formatting (§1), outline + page budgets + code areas (§2),
figure/table/listing IDs (§3), Markdown conventions (§4.3), gaps (§5), truthfulness traps (§6).

- Ukrainian academic register, impersonal; English only for the title, tech names, code, identifiers.
- Never invent facts, numbers, test results or features. Unknown → `[ПОТРЕБУЄ УТОЧНЕННЯ: …]`
  and list it in the ticket comment. Check §6 of PLAN.md before describing a feature.
- One chapter (or chapter part) per file in `chapters/` (names in PLAN.md §4.1); never edit
  another ticket's file.
- Headings carry explicit numbers: `# 3 Проєктування програмної системи`, `## 3.1 …`,
  run-in points `**3.1.1 Назва.** Текст`, every chapter ends with `## Висновки до розділу N`.
- Figures/tables/listings/formulas/scenarios use the IDs and syntax of PLAN.md §4.3, are referenced
  in the text before they appear and are followed by an explanatory paragraph.
- Diagrams: `diagrams/<name>.puml` (file name = figure ID with `fig-` prefix, e.g. `fig-components.puml`),
  first lines `@startuml` + `!pragma layout smetana` + `skinparam defaultFontName "Liberation Serif"`
  + `skinparam dpi 200` (Salt wireframes: `@startsalt` … `@endsalt` instead — PlantUML 1.2026.8 rejects
  `salt` inside `@startuml`; keep the other three lines). Render with `bash thesis/tools/build.sh --diagrams-only` and commit the PNG
  next to the `.puml`.
- Listings ≤ 25 lines, copied verbatim from the repository; elisions as `// ...`.
- Sources: add to `sources.yaml` (ДСТУ 8302:2015 string), cite as `[@key]`; only sources actually opened.
- Check volume with `python3 thesis/tools/wordcount.py thesis/chapters/<file>.md` against the
  PLAN.md §2 budget (±10 %). 240 words ≈ one full text page.
- Generated files — never edit by hand: `chapters/95-references.md` (`python3 thesis/tools/references.py`;
  `--check` fails on an unresolved `[@key]`, a duplicate or uncited source, or a stale list) and
  `chapters/A0-appendix-a.md` (`python3 thesis/tools/appendix.py`, code read from the commit pinned
  in the script). Re-run both after changing citations or the appendix listings.
- `front/task-sheet.md` is the separate «Завдання на кваліфікаційну роботу» form (not built into
  the thesis). Abbreviations list (`chapters/02-abbreviations.md`): add an entry when a new
  abbreviation is used ≥ 3 times; expand it in the text at first use.

## Build

`mise install && bash thesis/tools/build.sh` → `thesis/out/thesis.docx` (pandoc + `tools/thesis.lua`,
then `tools/assemble.py`; Python deps go into `.cache/venv` from `tools/requirements.txt`).
- `thesis.lua` numbers `fig:/tbl:/lst:/eq:/sc:` per chapter (from the `#` heading's number, or the
  letter of `# Додаток А …`), writes the captions, resolves `@id` (→ «3.1», `@eq:` → «(2.1)») and
  `[@key]` (→ «[n]», order of first citation). The source list goes into `::: {#refs} :::`, else
  under `# Список використаних джерел`, else before the first appendix. Unknown source key = error;
  unknown cross-reference = warning + «??» (error with `THESIS_STRICT=1`, use it for the final build).
  A literal `@` in prose (npm scopes) must be in backticks or escaped `\@`.
- `assemble.py` adds the title page (Appendix_A styles, fields from `metadata.yaml`; optional
  `consultants:` list), ЗМІСТ + TOC field before the first `#` element after АНОТАЦІЯ/ABSTRACT,
  and the header page number (top right, none on the title page). Fields fill in Word: Ctrl+A, F9.
- `assemble.py` also rules tables (full 175 mm width, columns fitted to content, header row
  centred, 12 pt for ≥ 5 columns or words that do not fit), keeps АНОТАЦІЯ/ABSTRACT out of ЗМІСТ
  (TOC Title style), and splits «ДОДАТОК А» / title onto two lines.
- Every full build runs `tools/qa.py`: each fig/tbl/lst/eq/sc defined once and referenced (ranges
  `@tbl:a–@tbl:c` count), main-text listings ≤ 25 lines; it regenerates `thesis/OPEN_ITEMS.md`
  (all `[ПОТРЕБУЄ …]` placeholders with location — generated, never edit by hand).
- `build.sh --pdf` → `out/thesis.pdf` via headless LibreOffice (`tools/pdf.sh` fetches it into
  `.cache/libreoffice`, no root; `tools/topdf.py` fills ЗМІСТ and prints **real page counts** per
  section — use these, not `wordcount.py`, for the PLAN.md §2 budget). `build.sh --release` = strict
  build + PDF copied to `thesis/final/` (the committed deliverable; re-run and commit after any
  chapter change). The PDF uses Liberation fonts; the author exports PDF/A from Word (G10).
- Toolchain change → `bash thesis/tools/build.sh --test` (fixture `tools/fixture/sample.md`, one
  of every element, checked by `tools/check_docx.py`); keep fixture and checker in sync.
