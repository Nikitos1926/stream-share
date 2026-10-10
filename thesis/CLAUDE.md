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
  - Use-case model = PLAN.md §0A.8 (user's diagram, 2026-10-10): actors Гість ◁ Глядач ◁ Стример
    (+ Google); exactly 13 use cases, each with a scenario; Join `<<include>>` Play, Stream-list
    `<<extend>>` Join, browser/app capture specialise «Вибрати джерело захоплення».
    Term spelling is «стример» everywhere (text, diagrams, test labels), never «стрімер»; «гість»
    only where it names the code's guest role (tests А5, А6, Б5, П4, З4).
  - UCP values are fixed in §0A.2 + §0A.8 (UCP ≈ 201,8); the goal wording is fixed in §0A.3.
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
  Sole exception: fig:gantt is `diagrams/fig-gantt.py` (matplotlib, Liberation Sans), because the user
  wants the table-style Gantt of example 1 (fig. 2.1), which PlantUML cannot lay out; its data must
  equal `tbl:wbs` word for word. `build.sh` runs every `diagrams/*.py` after PlantUML.
- Listings ≤ 25 lines, copied verbatim from the repository; elisions as `// ...`.
- Sources: add to `sources.yaml` (ДСТУ 8302:2015 string), cite as `[@key]`; only sources actually opened.
- Check volume with `python3 thesis/tools/wordcount.py thesis/chapters/<file>.md` against the
  PLAN.md §2 budget (±10 %). 240 words ≈ one full text page.
- Generated files — never edit by hand: `chapters/95-references.md` (`python3 thesis/tools/references.py`;
  `--check` fails on an unresolved `[@key]`, a duplicate or uncited source, or a stale list) and
  `chapters/A0-appendix-a.md` (`python3 thesis/tools/appendix.py`, code read from the commit pinned
  in the script). Re-run both after changing citations or the appendix listings.
- DB tables are described in §3.3 right after the ER diagram (user rule 2026-10-07): one table per
  real table, «Таблиця 3.N – Опис таблиці <name>», columns «Поле | Тип даних | Обмеження | Опис»,
  one field per row, each with an E2-style lead-in («Таблиця stream (табл. …) зберігає…»); keep
  them in sync with the schema of the DB module. There is no appendix Б any more.
- **Single appendix (user rule 2026-10-07):** the thesis has only «ДОДАТОК А Лістинг програми»
  (heading typed in caps, title unchanged); never add another appendix. The former appendix В was
  folded into §5.2 as one table tbl:tc-functional with the key cases (all failures, the timing
  cases); the rest stay only in the test scripts' output. Test-case
  table follows E2 table 5.1: «ID | Сценарій | Вхідні дані | Очікуваний результат | Фактичний
  результат», cells start with a capital, parameters as «Статус: 401», fact «Пройдено» /
  «Пройдено: <measured value>» / «Не пройдено: <actual>»; IDs А1…З5 match the test scripts' output.
  Appendix А lead-ins come from the `lead` field of `LISTINGS` in `tools/appendix.py` (role, no
  path). Volume is at the limit (2026-10-07, single appendix: main 80 of 80 pp, total 107
  of ~120 by `topdf.py`): any addition needs an equal cut. Chapter 3 widths of fig:seq-desktop-auth
  (15 cm), fig:state-stream and fig:er (13 cm) are set so those figures share a page with the text
  before them; a page that is half empty before a tall figure is the cheapest place to win a page.
- АНОТАЦІЯ and ABSTRACT fit on one page each (user rule 2026-10-07): bibliographic line, volume
  line (Regulations §6.3.2 template: main-text pages, sources and their pages, «додаток на N
  сторінках»), goal (§0A.3 verbatim) + object/subject worded as in ВСТУП, one results paragraph
  that states the key result of the conclusions (only the chosen app's picture and own sound,
  switch to a new window within 1,5 s), ≤ 10 keywords. On 2026-10-07 they use 26 and 25 of 28
  lines; numbers come from the `topdf.py` report — update them whenever the page counts change,
  and check the PDF that page 3 starts with ABSTRACT.
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
  It appends `thesis/CHECKLIST.md`, the hand-written result of the last full check against all
  rules (PLAN.md §0.7 + §0A greps, PDF checks); update it after every full re-check.
- `build.sh --pdf` → `out/thesis.pdf` via headless LibreOffice (`tools/pdf.sh` fetches it into
  `.cache/libreoffice`, no root; `tools/topdf.py` fills ЗМІСТ and prints **real page counts** per
  section — use these, not `wordcount.py`, for the PLAN.md §2 budget). `build.sh --release` = strict
  build + PDF copied to `thesis/final/` (the committed deliverable; re-run and commit after any
  chapter change). The PDF uses Liberation fonts; the author exports PDF/A from Word (G10).
- Toolchain change → `bash thesis/tools/build.sh --test` (fixture `tools/fixture/sample.md`, one
  of every element, checked by `tools/check_docx.py`); keep fixture and checker in sync.
