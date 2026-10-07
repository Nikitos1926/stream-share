# thesis/ — rules for agents writing the diploma thesis

Branch `diploma` only; ticket branches are cut from `diploma`, PRs target `diploma`, never `main`.
`thesis/PLAN.md` is binding: style addendum (§0), formatting (§1), outline + page budgets + code areas (§2),
figure/table/listing IDs (§3), Markdown conventions (§4.3), gaps (§5), truthfulness traps (§6).

- Ukrainian academic register, impersonal; English only for the title, tech names, code, identifiers.
- Never invent facts, numbers, test results or features. Unknown → `[ПОТРЕБУЄ УТОЧНЕННЯ: …]`
  and list it in the ticket comment. Check §6 of PLAN.md before describing a feature.
- One chapter (or chapter part) per file in `chapters/` (names in PLAN.md §4.1); never edit
  another ticket's file.
- Headings carry explicit numbers: `# 3 ПРОЄКТУВАННЯ ПРОГРАМНОЇ СИСТЕМИ` (level 1 typed in UPPER CASE except appendices, PLAN.md §0A.6.1), `## 3.1 …`; every
  chapter ends with `## Висновки до розділу N`. **No x.y.z level at all** (no `###`, no run-in
  `**3.1.1 …**`).
- **Style addendum 2026-10-06 = PLAN.md §0 (binding, overrides older rules).** In short:
  - Identifiers are plain text with a kind noun, never in backticks, italics or quotes.
  - No file paths or project tree; modules are named by role.
  - Use-case scenarios follow the E2 template.
  - Spacing values are in §0.5.
  - `tbl:analogs` has a stream-share column and ≤ 4 analogs.
  - Run the §0.7 checklist before every hand-off.
- **Revision addendum 2026-10-07 = PLAN.md §0A (binding, overrides §0–§6).** In short:
  - Actors are Глядач and Стример (+ Google); exactly 5 use cases, each with a scenario (§0A.1).
    Term spelling is «стример» everywhere (text, diagrams, test labels), never «стрімер»; «гість»
    only where it names the code's guest role (tests А5, А6, Б5, П4, З4).
  - UCP values are fixed in §0A.2; the goal wording is fixed in §0A.3.
  - Chapter 2 never names Git or any VCS, nor the source of its dates (§0A.4).
  - Exactly the 30 sources of §0A.5.
  - No «(підрозділ x.y)» or «розділ N» pointers in prose (§0A.6.2).
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
- Appendices Б (`B0-appendix-b.md`, DB column tables) and В (`C0-appendix-v.md`, test-case tables)
  are hand-written; their tables are defined there and referenced from §3.3 / §5.2. Test-case
  tables follow E2 table 5.1: «ID | Сценарій | Вхідні дані | Очікуваний результат | Фактичний
  результат», cells start with a capital, parameters as «Статус: 401», fact «Пройдено» /
  «Пройдено: <measured value>» / «Не пройдено: <actual>»; IDs А1…З5 match the test scripts' output.
  Appendix А lead-ins come from the `lead` field of `LISTINGS` in `tools/appendix.py` (role, no
  path). Volume is at the limit (2026-10-06 re-assembly: main 79 of 80 pp, total 121 of ~120 by
  `pages.txt`): any addition needs an equal cut.
- `front/task-sheet.md` is the separate «Завдання на кваліфікаційну роботу» form (not built into
  the thesis). Abbreviations list (`chapters/02-abbreviations.md`): add an entry when a new
  abbreviation is used ≥ 3 times; expand it in the text at first use.

## Build

`mise install && bash thesis/tools/build.sh` → `thesis/out/thesis.docx` (pandoc + `tools/thesis.lua`,
then `tools/assemble.py`; Python deps go into `.cache/venv` from `tools/requirements.txt`).
- `thesis.lua` numbers `fig:/tbl:/lst:/eq:/sc:` per chapter (from the `#` heading's number, or the
  letter of `# Додаток А …`), writes the captions, resolves `@id` (→ «3.1», `@eq:` → «(2.1)») and
  `[@key]` (→ «[n]», order of first citation). The source list goes into `::: {#refs} :::`, else
  under `# СПИСОК ВИКОРИСТАНИХ ДЖЕРЕЛ`, else before the first appendix. Unknown source key = error;
  unknown cross-reference = warning + «??» (error with `THESIS_STRICT=1`, use it for the final build).
  A literal `@` in prose (npm scopes) is escaped `\@`, never put in backticks (PLAN.md §0.2).
- `assemble.py` adds the title page (Appendix_A styles, fields from `metadata.yaml`, topic in sentence case; optional
  `consultants:` list), ЗМІСТ + TOC field before the first `#` element after АНОТАЦІЯ/ABSTRACT,
  and the header page number (top right, none on the title page). Fields fill in Word: Ctrl+A, F9.
- Spacing (PLAN.md §0.5) is mechanical: styles in `make_reference_docx.py` carry only `before`
  (captions/figure/formula/listing caption/scenario caption/Heading 2 = 24 pt, figure caption and
  code = 6 pt) and `after` = 0; `assemble.py` (`GAP_AFTER`) writes the gap after a table, listing,
  figure caption, formula, scenario or heading as `before` on the next paragraph — max, never sum.
  Never add empty paragraphs or manual spacing in the Markdown.
- `thesis.lua` renders inline code as plain body text (§0.2; listings keep Courier New) and lays out
  `::: {#sc:…}` scenarios: «Scenario Caption», rules above the first / below the last body paragraph
  (styles Scenario First/Last/Single), list items as typed «N. » paragraphs, flush left.
- «Продовження таблиці» for a table split across pages cannot be generated (Word has no such
  feature); the author adds it in Word after the final pagination (OPEN_ITEMS.md).
- `assemble.py` also rules tables (full 175 mm width, columns fitted to content, header row
  centred, 12 pt for ≥ 5 columns or words that do not fit; a column is never narrower than its
  longest word counted as ≥ 3 glyphs, capitals 1.35, so IDs like «ФВ-12» do not wrap), keeps АНОТАЦІЯ/ABSTRACT out of ЗМІСТ
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
