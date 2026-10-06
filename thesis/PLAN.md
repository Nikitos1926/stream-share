# Thesis plan — stream-share bachelor qualification work

**Title (EN, as given):** WEB SERVICE FOR STREAMING MEDIA CONTENT WITH THE FUNCTION OF CAPTURING
INDIVIDUAL APPLICATIONS. **UA working title:** «Вебсервіс для потокової передачі медіаконтенту з
функцією захоплення окремих застосунків» — `[ПОТРЕБУЄ УТОЧНЕННЯ: точна назва за наказом ректора]`.

This file is the single reference every thesis-writing ticket follows. It does **not** contain
thesis text. Branch rule: all thesis work lives on `diploma`; never merge it into `main`.

Sources studied (all in `docs/` on `diploma`):

| File | What it is | Used for |
| --- | --- | --- |
| `docs/Regulations_on_the_Qualification_Paper_2025.pdf` | «Положення про кваліфікаційні роботи…», Одеська політехніка, 2025 (27 pp.) | structure (§5), content rules (§6), abstract (§6.3), intro (§6.6), chapters (§6.7), PDF/A original (§9), bibliographic-description template (Додаток Г) |
| `docs/formatting_examples/Appendix_A_-_Sample_Title_Page_Formatting.docx` | title page template | title page, page geometry, fonts |
| `docs/formatting_examples/addendum_b_-_a_brief_of_annotation_formation.docx` | abstract (АНОТАЦІЯ / ABSTRACT) template | abstracts |
| `docs/formatting_examples/addendum_v_-_zrazok_oforlennya_zmistu.docx` | table-of-contents template | ЗМІСТ |
| `docs/formatting_examples/addendum_g_-_form_of_entry_form.docx` | ВСТУП template | introduction layout |
| `docs/example_of_completed_work/exmaple1.pdf` | 100-pt example, 121 ІПЗ, 2026, 90 pp. (71 pp. main text) | structure, depth, captions, listings, references |
| `docs/example_of_completed_work/example2.pdf` | 100-pt example, 121 ІПЗ, 2026, 105 pp. (78 pp. main text) | same |

Both examples come from the same department (Кафедра інженерії програмного забезпечення, ННІ
комп'ютерних систем) and share an identical six-chapter skeleton. We mirror it.

---

## 0. Style addendum (2026-10-06) — binding, overrides §1–§4 where they differ

The user reviewed the finished thesis and issued new rules on 2026-10-06. This section turns them
into checkable rules. It was measured from the two 100-pt examples with PyMuPDF (fonts, line
positions, ruling lines). **E1** = `exmaple1.pdf`, **E2** = `example2.pdf`. Page numbers are the
printed ones, which equal the PDF page index in both files. Every later thesis ticket runs the
checklist in §0.7 before it hands off.

### 0.1 Heading depth — no level-3 headings

- Only two numbered levels exist: chapter `# N …` and subsection `## N.M …`, plus
  `## Висновки до розділу N`. **Nothing numbered x.y.z, in any form.** No `###`/`####`, and no
  run-in bold points `**1.3.1 Назва.** …` either. Both are removed and never cross-referenced
  («у пункті 1.3.2» → «у підрозділі 1.3» or «вище»).
- Model = **E1**. Its ЗМІСТ (pp. 4–5) and its whole body use only x.y headings; no x.y.z appears
  anywhere. E2 does use run-in points (pp. 11–12, 20–31, 59–68, 70–78, and even x.y.z.w on pp. 31–34).
  That is exactly what the user has now forbidden, so **E2's points are not a model.** Supersedes
  §1.4 «Пункт», the run-in points of §2 (e.g. «пункти 2.1.1–2.1.5») and the `**1.1.1 …**` line of §4.3.
- How E1 structures content inside a long subsection instead (use these, in this order of preference):
  1. **Topic-first paragraphs.** Each paragraph opens with the object it is about, in plain text.
     Examples: «Goodreads [1] – найбільша у світі…» (E1 p. 8), «Платформа OpenTable дозволяє…»
     (E2 p. 9), «AuthenticationModule відповідає за…» (E1 p. 37), «Таблиця Reservation (табл. 3.1)
     містить…» (E2 p. 49).
  2. **Transition sentences** that announce the next part and point to its object. Examples:
     «Розглянемо перший варіант використання… (див. сценарій 1.1)» (E1 p. 10), «Наступним
     розглянемо…» (E1 pp. 11–12), «Перейдемо до оцінки варіантів використання (UUCW)…» (E1 p. 27),
     «Наступною розглянемо таблицю Book… (табл. 3.2)» (E1 p. 40).
  3. **Short lead-in sentence + list.** Example: «Основні актори вебзастосунку.» followed by
     definition paragraphs «Користувачі (читачі) – …» (E1 p. 7). Another: «Основними сутностями
     предметної області є:» + «1) …;» list (E1 p. 7). Another: «Виконаємо оцінку акторів (UAW):»
     + «–» list (E1 p. 27). Lists follow §1.5. Prose stays the default; a list is used only for
     genuinely enumerable items.
  4. **A further x.y subsection** when a part is large enough to deserve a ЗМІСТ entry. E1 has
     2–5 subsections per chapter (pp. 4–5). Renumber the following subsections and fix every
     «підрозділ N.M» reference.
- No bold run-in lead-ins inside chapters. In E1 the only bold text in the body is headings, the
  ВСТУП labels (p. 6) and the scenario field labels (pp. 10–24). The ВСТУП labels (§1.13) stay.

### 0.2 Software identifiers in running text

- Write identifiers (method, function, class, hook, variable, field, event or message type,
  environment variable, DB table/column, CLI command, HTTP route) in the **body font: Times New
  Roman 14, regular, no quotes, no italics, no bold, no monospace**. Measured examples: «Метод
  findLeastBusyWaiter», «анотацію @PreAuthorize», «роллю CUSTOMER» (E2 pp. 55–56); «Zod-схему
  bookSubmissionSchema», «поле suggestedPrice при isForSale=true» (E1 p. 52);
  «parseGoogleBookItem()», «API-ендпоінт /api/generate-book-description» (E1 p. 53). PyMuPDF
  reports all of them as TimesNewRomanPSMT 14, flags 4 (regular). Courier New appears only inside
  listings.
- **Inline code (Markdown backticks) is forbidden in prose, table cells, captions and appendix
  lead-ins.** Fenced listings are the only monospace.
- Introduce every identifier with its kind noun («метод», «функція», «клас», «хук», «подія»,
  «таблиця», «поле», «змінна оточення», «бібліотека»). Write it exactly as in the code, **without
  `()`**, as E2 does. The name is written in Latin script and is not declined: «метод
  setDisplayMediaRequestHandler», «у таблиці stream_to_user».
- Density as in the examples, which use about 3–10 identifiers per 3–4 pages of chapter 4.
  Name an identifier only when it ties the text to a listing, a diagram or a table (class diagram,
  DB tables). Otherwise describe the element by its role: «модуль слідування за вікнами», not a
  string of names.
- **Quotes «…» are for UI labels and use-case names only** («Зареєструватися», E2 p. 12;
  «Варіант використання «Реєстрація»», E2 p. 13), never for code identifiers.
- A literal `@` in prose (e.g. a decorator or an npm scope) is written as `\@`, never in
  backticks (thesis.lua treats a bare `@word` as a citation key).
- Product, library and protocol names are proper names, not identifiers: «mediasoup», «Electron»,
  «WebRTC», no kind noun needed (E1 pp. 51–52).

### 0.3 No file paths or project tree

- Nowhere in the text: no repository paths (`apps/…`, `packages/…`, `src/…`, `infra/…`,
  `thesis/…`), no file names with extensions (`*.ts`, `*.mjs`, `*.json`, `*.yml`, `*.puml`,
  `Dockerfile`, `docker-compose.yml`, `package.json`, …) and no directory trees. This covers
  prose, tables, captions, appendix lead-ins and footnotes. Neither example names a single source
  file anywhere, appendices included. The only hit in E1 is inside a code line, an import on
  p. 86.
- Describe modules **by role** and use this mapping consistently:

  | Repository unit | Name in the text |
  | --- | --- |
  | `apps/web` | вебзастосунок (Next.js) |
  | `apps/signaling` | сервер сигналізації та пересилання медіапотоків (short: сервер сигналізації) |
  | `apps/desktop` | настільний застосунок (Electron) |
  | `packages/db` | модуль доступу до бази даних (схема та міграції Drizzle) |
  | `packages/env` | модуль перевірки змінних оточення |
  | `packages/shared` | спільні типи та константи |
  | test scripts (`smoke.mjs`, `follower.mjs`) | сценарії автоматизованої перевірки (by purpose) |

  Table columns that carry package names (e.g. «Модуль: web, signaling» in table 1.2) use these
  role names instead, or are dropped.
- Level of detail, as in E2 4.2 (pp. 55–57, 3 pages, 3 listings) and E1 4.2 (pp. 52–55, 5
  listings). Each paragraph explains **what a mechanism does, its inputs, its checks and
  restrictions, what it delegates and what it returns or changes**, then points to the listing:
  «Метод створення бронювання клієнтом (див. лістинг 4.2) реалізує… Доступ… обмежено…
  Тіло запиту валідується… після чого метод… передає… до сервісного рівня» (E2 pp. 55–56).
  No walking through files, folders or build configuration.
- **Listing captions** describe content by role and may name a class or function, but **never a
  file**: «Лістинг 4.1 – Метод для отримання доступних столиків» (E2 p. 55), «Лістинг 4.1 – Код
  фрагменту Zod-схеми валідації подання книги» (E1 p. 52); ours, e.g. «Лістинг А.1 – Клас
  SourceFollower настільного застосунку».
- **Appendix А.** E1 (p. 79) and E2 (p. 86) give the code without file names; E1 separates parts
  with an ordinary code comment. We keep our captioned listings А.1…А.n. The lead-in sentence
  names the part by role: «Далі наведено клас слідування за вікнами настільного застосунку
  (лістинг А.1).». **Not** «Далі наведено файл `apps/desktop/…`». The appendix introduction
  mentions neither a commit hash nor a repository directory such as `thesis/diagrams`.
  `tools/appendix.py` generates this text, so the fix goes there.
- Code comments inside listings are code and stay verbatim. Do not add path comments.
- Commit hashes do not appear in the text. Chapter 2 may cite pull requests by number and date
  where the Git history is the source (its own ticket).

### 0.4 Use-case scenarios — template of E2 §1.3 (pp. 12–17)

E2 is the relevant model: our chapter 1 mirrors its skeleton («Аналіз наявних програмних
рішень», «Функціональні вимоги до програмної системи») and its scenario fields. The current
thesis format (§1.10, chapter file `11-chapter1-b.md`) is wrong and is replaced. Its defects:
- the hybrid fields «Мета/Результат» and «Передумови», which mix E1 and E2;
- labels at a 12.5 mm indent;
- steps as an indented, single-spaced Word list;
- no gap before the caption and none after the scenario;
- no ruling lines;
- alternative steps without «4а.1.» sub-steps.

Exact layout (measured E2 pp. 12–13):

```
                                        ← one empty line (24 pt) after the preceding text
      Сценарій 1.1 – Реєстрація         ← caption at paragraph indent 12.5 mm, regular, no final dot
──────────────────────────────────────  ← thin horizontal rule, full text width (0.5 pt)
Основна дійова особа: гість.            ← flush left, NO first-line indent; label bold, value regular
Результат: створено обліковий запис користувача.
Тригер: користувач відкриває сторінку реєстрації.
Основний успішний сценарій:             ← bold label alone on its line
1. Гість переходить до сторінки реєстрації.   ← flush left, typed «N. » (not a Word auto-list), 1.5 spacing
2. Система відображає форму для введення даних (повне ім’я, email та пароль).
3. Гість заповнює форму та натискає кнопку «Зареєструватися».
…
Альтернативні сценарії:                 ← bold label alone on its line
4а. Введені дані некоректні.            ← condition: main step number + Cyrillic letter (а, б, в…)
4а.1. Система виводить помилку та пропонує виправити дані. Повернення до п. 3.   ← reaction steps
5а. Обліковий запис з такою поштою вже існує.
5а.1. Система пропонує ввести іншу електронну пошту. Повернення до п. 3.
──────────────────────────────────────  ← closing rule, full text width
                                        ← one empty line (24 pt) before the following text
```

- **Field names, exactly and in this order:** «Основна дійова особа:», «Результат:»,
  «Тригер:», «Основний успішний сценарій:», «Альтернативні сценарії:». Nothing else: no «Мета»,
  «Мета/Результат», «Передумови», «Постумови», «Актор». A precondition is either expressed in
  «Тригер» or is self-evident from the actor (E2 «зареєстрований користувач (клієнт або
  офіціант)», p. 13).
- Values: lowercase start, end with «.». Steps: each a full sentence starting with the actor or
  «Система». Steps alternate between actor and system and use the present tense: «Гість
  заповнює…», «Система перевіряє…».
- Alternatives: «Na.» states the condition only; «Na.1.», «Na.2.» state the reaction. The return
  is worded «Повернення до п. N.» or «(перехід до п. N)». Inclusion of another use case is worded
  «Na.3. Варіант використання «Реєстрація».» (E2 p. 13). If there is no alternative, omit the
  label.
- Caption title = a **noun phrase**, identical to the oval on the use-case diagram: «Реєстрація»,
  «Авторизація», «Бронювання столика» (E2). Ours: «Вхід через Google», «Трансляція у браузері»,
  «Трансляція окремого застосунку». Never imperative verb phrases like «Увійти через Google».
  Update the diagram labels if they differ.
- Introduce all scenarios with one sentence and a range, with a source for the technique. E2
  p. 12: «…складемо сценарії [7] для кожного з них (сценарії 1.1 – 1.8)». Scenarios then follow
  one another with only the empty line between them. Optional one-sentence lead-ins as in E1 are
  allowed, but stay consistent.
- Prose, never a table. Numbering «Сценарій N.M» per chapter, en dash, as now.
- Markdown for writers (thesis.lua keeps `::: {#sc:…}`; the toolchain ticket renders the layout
  above). Steps are written as an ordinary Markdown list; the filter turns them into flush-left
  typed numbers:

  ```markdown
  ::: {#sc:sign-in caption="Вхід через Google"}
  **Основна дійова особа:** гість.

  **Результат:** користувач увійшов до системи та отримав сеанс.

  **Тригер:** гість відкриває сторінку входу.

  **Основний успішний сценарій:**

  1. Гість натискає кнопку «Увійти через Google».
  2. Система перенаправляє гостя до сервісу автентифікації Google.

  **Альтернативні сценарії:**

  2а. Гість скасовує вхід.

  2а.1. Система повертає гостя на сторінку входу.
  :::
  ```

### 0.5 Spacing around tables, figures, formulas, listings and their captions

Measured on E1 pp. 9–10, 29, 32 and E2 pp. 10, 12, 29, 55. The body line pitch is 24.15 pt
(TNR 14 at 1.5 lines). **«One empty line» = 24 pt.** The Regulations set no spacing (§1.1), so the
examples are binding. Ordinary body paragraphs keep 0/0.

| Element | Before | Between caption and object | After | Measured |
| --- | --- | --- | --- | --- |
| Table caption «Таблиця N.M – …» (above, at indent) | **24 pt** (one empty line after the text) | **0 pt**: the table starts right under the caption (visible gap ≈ 8 pt from line leading) | — | E1 p. 9, E2 p. 10 |
| Table (incl. «Продовження таблиці» parts) | — | — | **24 pt** before the next paragraph | E1 p. 9 (401→425), E2 p. 10 (686→711) |
| Figure (image paragraph, centred, **single** line spacing so the image line is not inflated ×1.5) | **24 pt** | caption follows directly: caption `before` **6 pt** (visible gap image→caption glyphs 9–12 pt) | — | E1 p. 10, E2 pp. 12, 29 |
| Figure caption «Рисунок N.M – …» (below, centred) | 6 pt | — | **24 pt** | E1 p. 10 (539→587), E2 p. 12 (355→403) |
| Formula line (centred, number «(N.M)» at right margin) | **24 pt** | — | **24 pt** (also when «де …» follows) | E1 pp. 29, 32 |
| Listing caption «Лістинг N.M – …» (above, at indent) | **24 pt** | **6 pt**, then code (Courier New 10, single) | — | E2 p. 55 (535→545) |
| Listing (last code line) | — | — | **24 pt** before the next paragraph | E2 p. 55 (657→684) |
| Scenario caption | **24 pt** | top rule right under it (rule 0.5 pt, `space` 1 pt) | — | E2 pp. 12–13 |
| Scenario body (last line) | — | — | closing rule, then **24 pt** | E2 p. 13 (173→rule 182→207) |
| Heading 2 «N.M …» / «Висновки до розділу N» | 24 pt (one empty line; now 21 pt in the reference DOCX, set to 24) | — | 24 pt | E1 p. 9 (619–667), E2 p. 55 |

Implementation rules for `make_reference_docx.py` / `assemble.py`:
- Values in OOXML: 24 pt = `w:before/w:after="480"`, 6 pt = `"120"`. Use paragraph spacing, not
  empty paragraphs. Empty paragraphs break at page tops and are not counted by the QA tools.
- **Max, not sum.** When two spaced elements meet (a figure caption followed by a table caption,
  a table followed by a listing caption), the gap stays 24 pt, not 48 pt. Implement every gap as
  `before` on the following element and set `after = 0`. The only exceptions are table ends and
  listing ends, which have no paragraph of their own: there, `assemble.py` sets `before = 480` on
  the first paragraph after them, unless that paragraph is a heading or already has ≥ 480.
- `keep_with_next` on table and listing captions, on the figure paragraph and on the scenario
  caption, so no caption is orphaned at a page end.
- Acceptance: build with `--pdf`, then measure with PyMuPDF on one page per element type, as
  done for this addendum. The visible gap from the text to a caption or object is ≥ 20 pt. The
  gap from an object to its caption glyphs is 6–16 pt. No caption touches its object or the
  neighbouring text.

### 0.6 Comparison table «Порівняння наявних програмних рішень» (`tbl:analogs`)

- The developed application is a **column**, the **first data column** after the criterion
  column. E1 table 1.1 (p. 9) has «Фактор порівняння | LibProj | Goodreads | LibraryThing |
  StoryGraph | BookClubs»; E2 table 1.1 (p. 10) has «Функціональна можливість | TasteTales |
  OpenTable | Resy | TableAgent». Header: «Функціональна можливість | stream-share | …».
- **At most 4 existing solutions** (E1 has 4, E2 has 3). Keep **Twitch + OBS Studio, Discord Go
  Live, Google Meet, Zoom**. Drop **YouTube Live**: its capture also goes through a third-party
  encoder, so it duplicates the OBS column. Drop **Parsec**: remote desktop is a different class
  and the least relevant. If a column cannot be backed by documentation, swap Zoom for YouTube
  Live. Remove the dropped ones from the 1.2 prose too, along with their now-uncited
  `sources.yaml` entries (`references.py --check`) and their mentions in `03-intro.md`.
- Rows are **functional capabilities** (6–10 rows as in E2). Cells hold only «+», «–» or «+/–»
  (partial, as E1 p. 9), centred. There are **no citations, notes or prose in cells**. Every mark
  for an existing solution must follow from the documentation cited in the prose description of
  that solution (E1 p. 8, E2 p. 9). Every stream-share mark must follow from the code (§6
  traps). After the table, one sentence explains what «+/–» means for each partial cell. If a cell
  cannot be established, drop or reword the criterion rather than guess.
- Candidate criteria, to be verified: захоплення окремого вікна застосунку; передавання звуку лише
  обраного застосунку; автоматичний перехід до нових вікон застосунку; перегляд у браузері без
  встановлення програм; перегляд без облікового запису; доступ глядачів за посиланням.
- Keep the caption «Порівняння наявних програмних рішень». It is followed by the conclusion
  paragraph, as in E1 p. 9 and E2 pp. 10–11.

### 0.7 Pre-completion checklist (every thesis ticket, before hand-off)

Run from the repository root. `C='thesis/chapters/[0-9A-C]*.md'`. Items 1–6 must print 0 or
nothing. The baseline on 2026-10-06 before the revision tickets: 1→0, 2→76, 3→201, 4→34,
6→10, 7→0.

```bash
C='thesis/chapters/[0-9A-C]*.md'
# 1 no level-3+ headings
grep -nE '^#{3,} ' $C
# 2 no x.y.z points or references to them
grep -nE '^(\*\*)?[1-6]\.[0-9]+\.[0-9]+' $C; grep -nE '(пункт[аіу]?|пп?\.) ?[1-6]\.[0-9]+\.[0-9]+' $C
# 3 no inline code outside fenced listings (prints offending lines)
awk 'FNR==1{f=0} /^```/{f=!f; next} !f && /`/{print FILENAME":"FNR": "$0}' $C
# 4 no paths / file names outside listings (references list and [@citation] keys excluded)
awk 'FNR==1{f=0} /^```/{f=!f; next} FILENAME ~ /95-references/ {next} {l=$0; gsub(/\[@[^]]*\]/,"",l)} !f && (l ~ /(^|[^A-Za-z:\/])(apps|packages|src|infra|docs|thesis)\// || l ~ /(^|[^A-Za-z])[a-z0-9_-]+\.(js|mjs|cjs|ts|tsx|json|ya?ml|puml|sql|sh|py|md)([^A-Za-z]|$)/ || l ~ /Dockerfile|docker-compose|package\.json|tsconfig|pnpm-workspace/){print FILENAME":"FNR": "$0}' $C
# 5 no italic/bold identifiers
grep -nE '(^|[^*])\*[A-Za-z_][A-Za-z0-9_.]*\*([^*]|$)|\*\*[A-Za-z_][A-Za-z0-9_.()]*\*\*' $C
# 6 scenario fields: only the five E2 labels
grep -nE '\*\*(Мета|Мета/Результат|Передумови|Постумови|Актор):\*\*' $C
# 7 comparison table has the developed app (must print 1)
grep -A2 '{#tbl:analogs}' thesis/chapters/10-chapter1.md | grep -c 'stream-share'
# 8 review by eye: Latin words in «» must be UI labels, not identifiers
grep -noE '«[A-Za-z_][A-Za-z0-9_.()]*»' $C
```

Then, not grep-able:
- Build: run `bash thesis/tools/build.sh --pdf` with `THESIS_STRICT=1`; `qa.py` must pass. Open
  the PDF and check one page of each kind against §0.5: no caption touches text or its object,
  and every table and figure has an empty line after it.
- Each chapter has ≥ 2 subsections, no x.y.z, and the ЗМІСТ shows two levels only.
- Every identifier is plain text with a kind noun and is tied to a listing, diagram or table (§0.2).
- Implementation is described by role, with no walking through the project structure (§0.3).
- Scenarios match §0.4 field by field.
- Chapter 2 facts trace to real commits or PRs. No invented stages, dates or results.
- Volume is still within §2 (main text 60–80 pp, by `topdf.py` page counts). Truthfulness traps
  (§6) are re-checked for every changed claim.

---


## 1. Formatting specification

The Regulations (2025) define structure and content but **contain no typographic rules** (no font,
margins or caption formats). Typography therefore comes from the official DOCX templates (measured
from their XML) and is confirmed by measuring the two examples' PDFs. Where they disagree, the rule
that wins is marked.

### 1.1 Page, font, paragraphs

| Item | Value | Source |
| --- | --- | --- |
| Paper | A4 portrait (210 × 297 mm), one-sided | templates |
| Margins | left **25 mm**, right **10 mm**, top **20 mm**, bottom **20 mm** | templates (`L900430 R360045 T/B720090` EMU); examples measure 25 / ≈9 mm |
| Body font | **Times New Roman 14 pt**, black | templates, examples |
| Line spacing | **1.5** (≈ 24 pt pitch, ≈ 29–30 lines per page) | templates, examples |
| First-line indent | **12.5 mm** (1.25 cm) | templates (`firstLine` 12.5 mm), examples (35 pt) |
| Alignment | justified; no extra space before/after body paragraphs | templates, examples |
| Hyphenation | allowed in body; **forbidden in headings and captions** | Regulations §6.1.4 |
| Header distance | 10 mm | templates |
| Language | Ukrainian; impersonal style («розглянемо», «визначено») | Regulations §6.1, user requirements |

### 1.2 Page numbering

- Arabic numerals, **top right** corner, Times New Roman 14, no dot, no dashes.
- The title page is page 1: it is **counted but the number is not printed**. Numbering is printed
  from the abstract (page 2) onward, through references and appendices (examples: «2», «3»…).
- Pages with figures/tables are counted.

### 1.3 Structural elements and order (Regulations §5.2, §6.4)

1. Титульний аркуш (Appendix_A template; fields in §5 Gaps).
2. АНОТАЦІЯ (UA) — starts on a new page.
3. ABSTRACT (EN) — starts on a new page.
4. ЗМІСТ.
5. ПЕРЕЛІК УМОВНИХ ПОЗНАЧЕНЬ (we include it: many abbreviations recur > 2 times).
6. ВСТУП.
7. Розділи 1–6, each ending with «Висновки до розділу N».
8. ЗАГАЛЬНІ ВИСНОВКИ.
9. СПИСОК ВИКОРИСТАНИХ ДЖЕРЕЛ.
10. ДОДАТКИ (А, Б, …).

Each structural element and each chapter **starts on a new page**.

### 1.4 Headings

| Level | Look | Example |
| --- | --- | --- |
| Structural element (ВСТУП, ЗМІСТ, АНОТАЦІЯ, ABSTRACT, ПЕРЕЛІК…, ЗАГАЛЬНІ ВИСНОВКИ, СПИСОК…) | bold, ALL CAPS, centred, no number, no dot | `ВСТУП` |
| Розділ | bold, ALL CAPS, centred, number + space + title, no dot; new page | `1 АНАЛІЗ ПРЕДМЕТНОЇ ОБЛАСТІ ТА СПЕЦИФІКАЦІЯ ВИМОГ` |
| Підрозділ | bold, sentence case, at paragraph indent (12.5 mm), number + title, no dot | `1.1 Аналіз предметної області` |
| Висновки до розділу | same as підрозділ, without number | `Висновки до розділу 1` |
| ~~Пункт~~ | **Forbidden since 2026-10-06 (§0.1)**: no x.y.z level at all, not even run-in | — |
| Додаток | `ДОДАТОК А` bold caps centred, title on the next line bold centred | `ДОДАТОК А` / `Лістинг програми` |

- One empty line (1.5) after a chapter heading and after a subsection heading, and one before a
  subsection heading that follows text (examples).
- Every chapter has **≥ 2 subsections** (Regulations §6.7.3) and ends with conclusions (§6.7.4).
- No abbreviations in headings except universally known ones (§6.1.5); no hyphenation (§6.1.4).
- Appendix letters: Ukrainian alphabet without Ґ, Є, З, І, Ї, Й, О, Ч, Ь → А, Б, В, Г, Д, Е, Ж, К …
  (ДСТУ 3008 convention; examples use «Додаток А»).

### 1.5 Lists

- Unordered items start with an en dash «–», lowercase, end with «;», last item «.» (examples).
- Ordered items: «1)», «2)» … lowercase, at paragraph indent.
- Prefer connected prose; lists only for genuinely enumerable items (user requirement).

### 1.6 Figures

> Spacing around figures, tables, formulas, listings and scenarios: **§0.5** (binding values).


- Caption **below** the figure, **centred**, regular 14 pt: `Рисунок 3.1 – Діаграма компонентів системи`
  (en dash with spaces, no final dot). Numbering per chapter (`N.M`); in appendices `А.1`.
- Figure centred, no indent; at least one empty line before the figure and after the caption.
- Every figure is referenced in the text **before** it appears: «(рис. 3.1)», «на рис. 3.1».
- Every figure is followed by a description paragraph explaining what it shows.
- All diagrams are PlantUML; screenshots are the only raster images (user requirement).

### 1.7 Tables

- Caption **above** the table, **left-aligned at paragraph indent** (12.5 mm):
  `Таблиця 2.1 – Оцінка технічних факторів` (no final dot). Per-chapter numbering.
- Table text 14 pt (12 pt allowed for wide tables), **single** line spacing, no first-line indent;
  header row centred.
- A table split across pages: on the next page write `Продовження таблиці 2.1` (or
  `Кінець таблиці 2.1` on the last part) at paragraph indent, and repeat the header row or a
  row of column numbers (examples, 10 pt). This is a **manual final-pass step** in Word after
  pagination is final (pandoc cannot do it).
- Reference in text: «(табл. 2.1)», «у табл. 2.1».
- Tables are real tables, never images (Regulations §9.3).

### 1.8 Formulas

- Centred on its own line; number in parentheses at the right margin: `(2.1)`; per-chapter numbering.
- Explanation of symbols right after the formula, starting with «де».
- Reference in text: «за формулою (2.1)». Formulas end with the punctuation of the sentence
  (examples: `UCP = UAW + UUCW.   (2.1)`).

### 1.9 Code listings

- Caption **above**, at paragraph indent: `Лістинг 4.1 – Фрагмент класу SourceFollower` (no final dot).
- Code: **Courier New 10 pt**, single spacing, left-aligned, no first-line indent, original
  indentation preserved, lines ≤ ~85 characters (wrap manually).
- In the main text only short fragments (≤ ~25 lines) that explain a design decision (user
  requirement); longer code goes to «Додаток А Лістинг програми».
- Reference in text: «(див. лістинг 4.1)».
- Code is copied verbatim from the repository at a pinned commit; elisions marked `// ...`.

### 1.10 Use-case scenarios

> **Superseded by §0.4** (exact E2 template). The description below is the old, wrong format.


Examples present use cases as numbered scenarios, captioned like a table:
`Сценарій 1.1 – Розпочати трансляцію` at paragraph indent, then blocks with bold run-in labels
«Основна дійова особа:», «Мета/Результат:», «Передумови:», «Тригер:», «Основний успішний
сценарій:» (numbered steps 1., 2., …), «Альтернативні сценарії:» (4а., 4а.1., …).

### 1.11 References (СПИСОК ВИКОРИСТАНИХ ДЖЕРЕЛ)

- Order: **order of first citation in the text** (Regulations §6.9).
- In-text citation: square brackets with a space before: «… mediasoup [12]», «[3, 5]», «[7, с. 15]».
- Entry style: **ДСТУ 8302:2015** («Бібліографічне посилання»), as used by both examples:
  - web resource: `Назва. URL: https://… (дата звернення: 05.10.2026).`
  - standard / RFC: `RFC 8829. JavaScript Session Establishment Protocol (JSEP) / J. Uberti et al. IETF, 2021. URL: … (дата звернення: …).`
  - book: `Cockburn A. Writing Effective Use Cases. Upper Saddle River : Addison-Wesley, 2001. 204 p.`
  - article: `Автор А. А. Назва. Назва журналу. 2025. Т. 6, № 3. С. 363–378.`
- Numbered list «1.», «2.», … at paragraph indent, 14 pt, 1.5 spacing, justified.
- Target 25–35 sources, mostly official specs/docs (W3C, IETF RFCs, mediasoup, Electron, Next.js,
  Auth.js, Fastify, Drizzle, PostgreSQL, Docker), plus methodology (UCP, use cases, testing) and a
  few scientific publications on WebRTC/SFU latency. Every source is cited at least once.
- Only real, verifiable sources; date of access = the date the writer actually opened it.

### 1.12 Abstracts (Regulations §6.3, addendum_b template)

Paragraphs, in order: (1) bibliographic description per Додаток Г template (generator:
https://bo.op.edu.ua); (2) volume sentence «Кваліфікаційна робота містить основну текстову частину
на … сторінках, список використаних джерел з … найменувань на … сторінках, додатки на …
сторінках.»; (3) results (purpose, what was analysed / designed / implemented / tested);
(4) «Ключові слова:» 5–15 keywords in nominative case, comma-separated. UA abstract ≥ 500
characters with spaces. EN «ABSTRACT» mirrors it («Keywords:»). Written **last**, after page counts
are final.

### 1.13 Introduction (Regulations §6.6, addendum_g template)

Run-in bold labels, in order: **Актуальність теми роботи.** **Мета і задачі роботи.** (goal,
then «–» list of tasks that map 1:1 onto chapters) **Об'єкт роботи.** **Предмет роботи.**
**Практична значущість.** (example 2) **Апробація матеріалів роботи.** (only if a real
publication/talk exists → cite it as source [1], like example 2). Example 2 states a **measurable
goal** that chapter 6 then verifies — we plan the same (see Gaps G7).

### 1.14 Conflicts and resolutions

| Conflict | Resolution (winner) |
| --- | --- |
| Regulations give no typography | DOCX templates (official annex of the same Regulations) win; examples confirm |
| Right margin: template 10 mm vs examples ≈ 9 mm | template **10 mm** |
| Example 1 cites without space «Goodreads[1]» | ДСТУ/Ukrainian typography: **space before «[»** (example 2 / standard) |
| Example 2 TOC lists 3.4 before 3.3 page-wise (page error) | TOC is a generated field, always updated before export |
| Regulations §6.1.6 «no foreign words if a Ukrainian equivalent exists» vs user's «English for technology names / established IT terms» | technology, library, API, protocol names and identifiers stay in English/original (§6.1.2 «власні назви мовою оригіналу»); generic terms in Ukrainian (e.g. «потокова передача», not «стрімінг» in prose; «застосунок», not «апка») |
| Appendix code vs Regulations §6.10 «main results (program code) are not appendices» | both 100-pt examples put «Додаток А Лістинг програми»; the department accepts it → we follow the examples, while key fragments are also in chapter 4 |
| Graphical part (§7) | not planned unless the task form («Завдання») requires it — Gap G3 |
| Delivery format | final original is **PDF/A with text layer + КЕП signature** (§9); we produce DOCX, the user exports PDF/A from Word and signs — Gap G10 |

---

## 2. Thesis outline (main text target ≈ 73 pages, allowed 60–80)

Page budget unit: **1 full text page ≈ 240 words** (measured: examples' full text pages have a
median of 239–247 words, ≈ 1 900 characters). A half-page diagram ≈ 0.5 page, a full-page diagram
≈ 1 page, a table ≈ (rows × 1.3 + 3) / 29 pages, a listing ≈ code lines / 60 pages
(10 pt single ≈ 60 lines per page). Write ±10 % of the target; do not pad.

Codes in «Code» columns are paths in the repository (`main` content is identical in `diploma`).
Figure/table/listing IDs refer to §3.

### Вступ — 3 pp. → ticket «front/back matter» (draft by the Chapter 1 ticket)

Actuality (live streaming of a single application with its own audio; browser limits of
`getDisplayMedia`), goal + 6 tasks (one per chapter), object («процес розробки вебсервісу для
потокової передачі медіаконтенту»), subject («вебсервіс stream-share з функцією захоплення окремих
застосунків…»), practical significance (deployed at https://streamshare.space, desktop installers),
approbation (only if real — Gap G6). Code: `README.md` features list.

### Розділ 1 Аналіз предметної області та специфікація вимог — 15 pp.

| § | Title | pp. | Content | Code / sources | Items |
| --- | --- | --- | --- | --- | --- |
| 1.1 | Аналіз предметної області | 4 | streaming media content (live vs on-demand); screen/window/application capture and why per-application capture + per-application audio is not available in the browser; WebRTC stack (ICE, DTLS-SRTP, RTP/RTCP); topologies mesh / MCU / SFU and why SFU fits one-to-many; delivery latency classes WebRTC vs HLS/RTMP (cited, not measured); actors (стрімер, глядач, гість) | `apps/desktop/src/conveyor/handlers/stream.handler.ts`, `apps/desktop/src/audioWorker/*`, `apps/signaling/src/services/mediasoup.service.ts`; W3C WebRTC, W3C Screen Capture, RFC 8825/8829, mediasoup docs | Т1.2, Р1.2 |
| 1.2 | Аналіз наявних програмних рішень | 3.5 | Twitch + OBS Studio, YouTube Live, Discord (Go Live), Google Meet / Zoom screen share, Parsec — comparison by: viewing in browser without install, capture of one application, capture of that application's audio, delivery latency class, private broadcasts, guest viewing without account, following the application's child windows; conclusion = niche | official product docs only; unverifiable cells → `[ПОТРЕБУЄ УТОЧНЕННЯ]` | Т1.1 |
| 1.3 | Функціональні вимоги до програмної системи | 5 | use-case diagram + 5 scenarios: (1) вхід через Google (web; desktop via system browser), (2) розпочати трансляцію у браузері, (3) розпочати трансляцію окремого застосунку в desktop-застосунку (вибір вікна, звук застосунку, слідування за дочірніми вікнами), (4) переглянути трансляцію (у т. ч. як гість), (5) завершити трансляцію / відновлення з'єднання стрімера; plus private stream + thumbnails as requirements text | `apps/web/src/app/**` routes, `apps/web/src/proxy.ts`, `apps/web/src/lib/auth/auth.ts`, `Watch.tsx`, `broadcast/page.tsx`, `apps/desktop/src/conveyor/*`, `apps/desktop/src/main/sourceFollower.ts`, `packages/shared/src/enums/wsMethods.ts` | Р1.1, Сц1.1–1.5 |
| 1.4 | Нефункціональні вимоги | 2 | quality attributes grouped like example 2: продуктивність (H.264 hardware encode up to 1080p60/1440p60/4K source — from code/commits; bitrate ceilings from `packages/shared/src/media/bitrate.ts`), надійність (streamer reconnect, guest pruning), безпека (JWT session cookie, `Secure` cookie in prod, env validation, PKCE), сумісність (Windows/macOS/Linux installers, auto-update Win+Linux), зручність. **Only numbers present in code**; target latency etc. → Gap G7 | `apps/web/src/lib/media/encoding.ts`, `packages/shared/src/media/bitrate.ts`, `apps/desktop/electron-builder.yml`, `apps/desktop/src/main/updater.ts`, `packages/env/*` | — |
| — | Висновки до розділу 1 | 0.5 | | | |

### Розділ 2 Планування програмного проєкту — 8 pp.

| § | Title | pp. | Content | Code / sources | Items |
| --- | --- | --- | --- | --- | --- |
| 2.1 | Оцінювання тривалості розробки | 4 | Use Case Points (as both examples): UAW, UUCW (from §1.3 use cases), TCF, EF, AUCP, effort with productivity factor (cite Karner/Clemmons); five stages as paragraphs with transition sentences (no x.y.z, §0.1). Weights are methodological judgements, stated as such | use cases of §1.3; Clemmons 2006 (UCP) | Т2.1–2.4, формули (2.1)–(2.5) |
| 2.2 | Розробка плану виконання проєкту | 2 | work breakdown with durations/dependencies + Gantt chart; real dates anchored to git history (first commit 2026-05-27 → 2026-09-25, 44 commits) and the thesis period | `git log` of `main`; Gap G8 | Т2.5, Р2.1 |
| 2.3 | Аналіз ризиків та планування реакцій | 1.5 | risk register: probability/impact/response. Real, code-evidenced risks: ICE/NAT failures (`MEDIASOUP_ANNOUNCED_IP`), Google rejecting embedded user agent (solved by system-browser sign-in), native module rebuild per OS, hardware H.264 encoder availability, unsigned installers, single-developer schedule | `README.md`, `apps/desktop/src/main/googleAuth.ts`, `electron-builder.yml`, `.github/workflows/desktop-release.yml` | Т2.6 |
| — | Висновки до розділу 2 | 0.5 | | | |

### Розділ 3 Проєктування програмної системи — 16 pp.

| § | Title | pp. | Content | Code | Items |
| --- | --- | --- | --- | --- | --- |
| 3.1 | Архітектура програмної системи | 3.5 | three runtime parts (web — Next.js; signaling — Fastify + mediasoup SFU; desktop — Electron shell over the deployed web app) + shared packages; responsibility split; production deployment (Caddy, Docker Compose, UDP port range, GHCR images) | `apps/*`, `packages/*`, `infra/docker-compose.prod.yml`, `infra/caddy/Caddyfile`, `.github/workflows/*` | Р3.1, Р3.2 |
| 3.2 | Проєктування процесів у системі | 5 | sequence: publishing a stream; sequence: watching a stream (incl. guest sign-in); sequence: desktop Google sign-in via system browser (PKCE + loopback); activity: following the captured application's child process and returning; state machine of a stream | see figures | Р3.3–Р3.7, Т3.1 |
| 3.3 | Проєктування структури бази даних | 3 | ER diagram + column tables for `user`, `account`, `stream`, `stream_to_user`, `audit_log`; why Auth.js adapter tables; cascade deletes | `packages/db/src/schemas/*`, `packages/db/src/relations.ts`, `apps/web/src/lib/db/adapter.ts` | Р3.8, Т3.2–3.6 |
| 3.4 | Проєктування класів | 2 | signaling server classes: controllers → services → repositories, hand-rolled DI container; desktop IPC «conveyor» (api / handlers / zod schemas) | `apps/signaling/src/{controllers,services,repositories,di}`, `apps/desktop/src/conveyor/*` | Р3.9, Р3.10 |
| 3.5 | Проєктування інтерфейсу користувача | 2 | wireframes (PlantUML Salt) of the broadcast page with the desktop source picker and of the watch page with video controls; navigation map | `apps/web/src/app/(main)/broadcast/**`, `…/[streamId]/watch/*`, `apps/web/src/app/components/video/*` | Р3.11, Р3.12 |
| — | Висновки до розділу 3 | 0.5 | | | |

### Розділ 4 Програмна реалізація системи — 16 pp.

| § | Title | pp. | Content | Code | Items |
| --- | --- | --- | --- | --- | --- |
| 4.1 | Вибір інструментів розробки | 2.5 | justified stack with versions: TypeScript, pnpm workspace, Next.js 16 / React 19 / Tailwind 4, Fastify 5 + `@fastify/websocket`, mediasoup 3 (vs. Janus / LiveKit — cite docs), Electron 35 (vs. Tauri: `desktopCapturer`, native audio module), Drizzle ORM + PostgreSQL, Auth.js 5, Docker Compose + Caddy, electron-builder | `package.json` files, `pnpm-workspace.yaml` | Т4.1 |
| 4.2 | Реалізація захоплення окремих застосунків | 4 | enumerating sources via `desktopCapturer`; window → PID (`getPidFromWindowHandle`); per-application audio in a utility process via `electron-native-screenshare` and its bridge into the web page; typed IPC with zod validation; `SourceFollower` (poll 1 500 ms, return grace 4 000 ms, process family) | `apps/desktop/src/conveyor/handlers/stream.handler.ts`, `conveyor/schemas/stream.schema.ts`, `audioWorker/audioCapture.worker.ts`, `apps/web/src/lib/media/audio.bridge.ts`, `main/sourceFollower.ts`, `main/processFamily.ts`, `main/processTable.ts`, `apps/web/src/lib/hooks/useSourceFollower.ts`, `lib/media/sourceSwitch.ts` | Л4.1–Л4.3 |
| 4.3 | Реалізація потокової передачі на основі WebRTC та SFU | 4 | mediasoup workers and least-loaded worker choice; router codecs (H.264 first, VP8 fallback); WebRTC transports; signaling protocol over WebSocket (shared message types); encoder parameters (resolution scaling, max framerate, degradation preference, bitrate budget, start bitrate); viewer layer preference; streamer reconnect events; thumbnails | `apps/signaling/src/services/{mediasoup,streamers,viewers}.service.ts`, `controllers/streams.controller.ts`, `packages/shared/src/{ws,types/protocol,media}/*`, `apps/web/src/lib/hooks/{useStreamer,useViewer,useThumbnailCapture}.ts`, `lib/media/{encoding,WsClient}.ts` | Л4.4–Л4.7, Т4.2 |
| 4.4 | Реалізація автентифікації та авторизації | 2.5 | Auth.js: Google provider + `guest` credentials provider, JWT strategy, Drizzle adapter; route gate in `proxy.ts`; signaling verifies the Auth.js session cookie itself; desktop sign-in in the system browser (PKCE, loopback server, hand-off back into the Electron session) | `apps/web/src/lib/auth/{auth,desktopHandoff}.ts`, `apps/web/src/proxy.ts`, `apps/web/src/app/api/desktop-auth/*`, `apps/signaling/src/auth/*`, `packages/shared/src/auth/sessionCookie.ts`, `apps/desktop/src/main/googleAuth.ts` | Л4.8–Л4.10 |
| 4.5 | Реалізація рівня даних і програмного інтерфейсу сервера | 1.5 | repositories over Drizzle; REST + WS endpoints; scheduled pruning of stale guests; environment validation (`createEnv`) | `apps/signaling/src/repositories/*`, `controllers/*`, `services/users.service.ts`, `packages/env/src/*` | Т4.3, Л4.11 |
| 4.6 | Реалізація інтерфейсу користувача та розгортання | 1 | page composition (home stream list, broadcast, watch), hooks; Docker images by tag, desktop installers + auto-update | `apps/web/src/app/**`, `.github/workflows/*`, `apps/desktop/src/main/updater.ts` | — |
| — | Висновки до розділу 4 | 0.5 | | | |

### Розділ 5 Тестування програмної системи — 7 pp.

| § | Title | pp. | Content | Code | Items |
| --- | --- | --- | --- | --- | --- |
| 5.1 | Принципи вибору тестових прикладів | 1 | test cases derived from §1.3 use cases + NFRs; positive/negative inputs; the repository has **no automated tests** — say so honestly; static verification (`pnpm lint`, `pnpm typecheck`, `pnpm build`) is real and reproducible | root `package.json` scripts, `eslint.config.mjs`, `tsconfig.base.json` | — |
| 5.2 | Функціональне тестування | 3.5 | test-case tables (ID, сценарій, вхідні дані, очікуваний результат, фактичний результат) for: автентифікація; трансляція з браузера; захоплення застосунку в desktop; перегляд (у т. ч. гість, приватна трансляція); завершення/відновлення. **Actual results only from real runs** (Gap G4) | — | Т5.1–5.5 |
| 5.3 | Нефункціональне тестування | 2 | performance (delivery latency, CPU/GPU load, achieved bitrate/fps per profile via `chrome://webrtc-internals`), compatibility (OS × browser matrix), security checks (route gate, cookie flags). **Measured numbers only from the user** (Gap G5) | — | Т5.6 |
| — | Висновки до розділу 5 | 0.5 | | | |

### Розділ 6 Експлуатація програмної системи — 6 pp.

| § | Title | pp. | Content | Code | Items |
| --- | --- | --- | --- | --- | --- |
| 6.1 | Контрольний приклад застосування програмної системи | 3.5 | end-to-end walkthrough with screenshots: install desktop app → sign in → choose application window → start (private) stream → viewer opens link as guest → app spawns child window (follow) → end stream | real UI (screenshots — Gap G2) | Р6.1–Р6.8 |
| 6.2 | Експлуатаційні випробування програмної системи | 2 | verify the measurable goal from the introduction on the deployed service (Gap G7); method, conditions, results table, interpretation | — | Т6.1 |
| — | Висновки до розділу 6 | 0.5 | | | |

### Загальні висновки — 2 pp. → ticket «front/back matter»

One paragraph per task from the introduction, each answered with the concrete result; the goal
achieved; directions for further work (e.g. automated tests, macOS auto-update — only real gaps).

### Budget check

Вступ 3 + Р1 15 + Р2 8 + Р3 16 + Р4 16 + Р5 7 + Р6 6 + Висновки 2 = **73 pp.** (60–80 allowed).
Whole document ≈ 1 title + 2 abstracts + 2 contents + 1–2 abbreviations + 73 + 3 references +
≈ 15–20 appendices ≈ **100–105 pp.** (≤ 120).

### Ticket mapping

| Existing ticket | Writes |
| --- | --- |
| Chapter 1: domain analysis, existing solutions, task statement | §1.1, §1.2, draft of «Вступ» (actuality, goal, tasks, object, subject) |
| Chapter 2: requirements and justification of the technology stack | §1.3, §1.4, Висновки до розділу 1, **§4.1** |
| Chapter 3: system design and architecture (PlantUML) | Розділ 3 (all figures Р3.x) |
| Chapter 4 (part A): application capture and WebRTC streaming | §4.2, §4.3 |
| Chapter 4 (part B): web service, auth, data layer, UI | §4.4, §4.5, §4.6, Висновки до розділу 4 |
| Chapter 5: testing and analysis of results | Розділ 5 |
| **missing — to create** | Розділ 2 (planning: UCP, Gantt, risks) |
| **missing — to create** | Розділ 6 (control example + operational trials; needs user screenshots/measurements) |
| **missing — to create** | Toolchain: implement `thesis/tools/` (Lua filter, reference.docx, assembly) |
| **missing — to create** | Front/back matter + final assembly: abstracts, переліки, final Вступ, Загальні висновки, references consolidation, Додаток А, DOCX build, page-count fill-in |

Chapter numbers in existing ticket titles differ from the thesis numbering above; **this plan's
numbering wins**.

---

## 3. Figures, tables, listings

IDs are the Markdown cross-reference IDs (§4.3). Numbers are indicative; the filter assigns them.

### 3.1 Figures (source `thesis/diagrams/fig-<name>.puml`, rendered `fig-<name>.png` beside it; ID `fig:<name>`)

| No. | ID | PlantUML type | Shows | Reflects code |
| --- | --- | --- | --- | --- |
| 1.1 | `fig:use-cases` | use case | actors Гість, Користувач (стрімер / глядач), Google (external); use cases of §1.3 | routes in `apps/web/src/app`, `proxy.ts`, desktop IPC `conveyor/api/*` |
| 1.2 | `fig:topologies` | component (conceptual) | mesh vs MCU vs SFU media flows, SFU highlighted as chosen | `mediasoup.service.ts` (SFU) |
| 2.1 | `fig:gantt` | `@startgantt` | project tasks and their real dates | git history (Gap G8) |
| 3.1 | `fig:components` | component | web / signaling / desktop / packages(db, env, shared) / PostgreSQL / Google OAuth; HTTP, WS, WebRTC, IPC links | `apps/*`, `packages/*` imports |
| 3.2 | `fig:deployment` | deployment | host with Docker Compose: caddy, web, signaling (UDP RTC port range), postgres, migrate, thumbnails volume; browser and desktop clients; GHCR / GitHub Releases | `infra/docker-compose.prod.yml`, `infra/caddy/Caddyfile`, workflows |
| 3.3 | `fig:seq-broadcast` | sequence | streamer page ↔ WS `/ws/streams/:id/broadcast` ↔ StreamersService ↔ MediasoupService: `getRtpCapabilities` → `createTransport` → `connectTransport` → `produce`; status → live | `useStreamer.ts`, `streams.controller.ts`, `streamers.service.ts`, `mediasoup.service.ts`, `wsMethods.ts` |
| 3.4 | `fig:seq-watch` | sequence | viewer (guest sign-in) ↔ WS `/watch`: `joinStream` → `createTransport` → `connectTransport` → `consume` → `setPreferredLayer`; `streamEnd`/`streamerDisconnect` events | `Watch.tsx`, `useViewer.ts`, `viewers.service.ts` |
| 3.5 | `fig:seq-desktop-auth` | sequence | Electron main → system browser → `/api/desktop-auth/start` → Google → loopback server → `/api/desktop-auth/complete` → session cookie in Electron | `googleAuth.ts`, `desktop-auth/*/route.ts`, `desktopHandoff.ts` |
| 3.6 | `fig:act-follow` | activity | polling loop of `SourceFollower`: detect new window of the same process family → switch source → return to the anchor after grace period | `sourceFollower.ts`, `processFamily.ts` |
| 3.7 | `fig:state-stream` | state | `created → connecting → live ↔ reconnecting → ended` with end reasons | `streams.schema.ts` (`StreamStatus`, `StreamEndReason`), `streams.controller.ts`, `streams.service.ts` |
| 3.8 | `fig:er` | entity (IE notation) | 5 tables with keys and FKs | `packages/db/src/schemas/*`, `packages/db/src/relations.ts` |
| 3.9 | `fig:classes-signaling` | class | controllers, services, repositories, DI container and dependencies | `apps/signaling/src/**` |
| 3.10 | `fig:classes-conveyor` | class / component | preload API ↔ IPC channels ↔ handlers ↔ zod schemas; audio utility process | `apps/desktop/src/{preload,conveyor,audioWorker}` |
| 3.11 | `fig:ui-broadcast` | Salt wireframe | broadcast page: source picker (screens / windows), follow toggle, quality, start | `broadcast/page.tsx`, `broadcast/components/electron/*` |
| 3.12 | `fig:ui-watch` | Salt wireframe | watch page: player, controls (volume, quality layer, fullscreen) | `watch/*`, `apps/web/src/app/components/video/*` |
| 6.1–6.8 | `fig:scr-*` | screenshot (PNG, not PlantUML) | control example steps | real UI — Gap G2 |

### 3.2 Tables

| No. | ID | Content | Source of data |
| --- | --- | --- | --- |
| 1.1 | `tbl:analogs` | comparison of stream-share with ≤ 4 existing solutions (§0.6) | official docs (cited) |
| 1.2 | `tbl:delivery` | delivery technologies (WebRTC, HLS, RTMP): transport, typical latency class, browser support | specs / docs (cited) |
| 2.1–2.4 | `tbl:ucp-*` | UCP: actors, use cases, technical factors, environmental factors | §1.3 + method |
| 2.5 | `tbl:wbs` | works, duration, dependencies | git history (Gap G8) |
| 2.6 | `tbl:risks` | risk register | code / README evidence |
| 3.1 | `tbl:ws-protocol` | WS actions and events with direction and payload | `packages/shared/src/enums/wsMethods.ts`, `types/protocol/ws.ts` |
| 3.2–3.6 | `tbl:db-*` | columns of `user`, `account`, `stream`, `stream_to_user`, `audit_log` | schemas |
| 4.1 | `tbl:stack` | technologies with versions and role | `package.json` files |
| 4.2 | `tbl:encoding` | encoder parameters per source profile, **computed from code formulas** | `encoding.ts`, `bitrate.ts` |
| 4.3 | `tbl:api` | REST and WS endpoints | `controllers/*` |
| 5.1–5.5 | `tbl:tc-*` | functional test cases | user runs (Gap G4) |
| 5.6 | `tbl:nfr` | non-functional test results | user measurements (Gap G5) |
| 6.1 | `tbl:trials` | operational trial results | user measurements (Gap G7) |

### 3.3 Listings (main text; ≤ 25 lines each)

| No. | ID | Fragment | File |
| --- | --- | --- | --- |
| 4.1 | `lst:get-sources` | enumerating windows/screens and resolving the PID | `apps/desktop/src/conveyor/handlers/stream.handler.ts` |
| 4.2 | `lst:audio-worker` | per-application audio capture in the utility process | `apps/desktop/src/audioWorker/audioCapture.worker.ts` |
| 4.3 | `lst:follower` | decision step of `SourceFollower` | `apps/desktop/src/main/sourceFollower.ts` |
| 4.4 | `lst:worker-pick` | least-loaded mediasoup worker | `apps/signaling/src/services/mediasoup.service.ts` |
| 4.5 | `lst:codecs` | router media codecs, H.264 first | same |
| 4.6 | `lst:encoding` | encoder parameter selection | `apps/web/src/lib/media/encoding.ts` |
| 4.7 | `lst:ws-message` | typed WS message construction / parsing | `packages/shared/src/ws/*` |
| 4.8 | `lst:authjs` | Auth.js providers and JWT strategy | `apps/web/src/lib/auth/auth.ts` |
| 4.9 | `lst:jwt-verify` | signaling verifies the session cookie | `apps/signaling/src/auth/jwt.ts` |
| 4.10 | `lst:pkce` | PKCE + loopback in the desktop main process | `apps/desktop/src/main/googleAuth.ts` |
| 4.11 | `lst:prune-cron` | scheduled guest pruning | `apps/signaling/src/services/users.service.ts` |

**Додаток А «Лістинг програми»** (≈ 15–20 pp.): full `sourceFollower.ts`, `mediasoup.service.ts`,
the WS part of `streams.controller.ts`, `useStreamer.ts` (abridged), `googleAuth.ts`. Pin the
commit hash in the appendix intro sentence.

**Додаток Б «Структура таблиць бази даних»** (tables Б.1–Б.5, the column tables of §3.3) and
**Додаток В «Тестові приклади функціонального тестування»** (tables В.1–В.5, the test-case tables
of §5.2) were moved out of the main text to keep it within 60–80 pp. Appendices are lettered in the
order of their first mention: А in §3.1.1, Б in §3.3.2, В in §5.2. Додаток А omits imports, helper
code and fragments already shown in the main text, so the whole document stays ≤ ~120 pp.

---

## 4. Source format and toolchain

### 4.1 Layout (`thesis/`)

```
thesis/
  PLAN.md               this file
  CLAUDE.md             short rules for writing agents
  metadata.yaml         title-page / abstract fields (placeholders until the user fills them)
  sources.yaml          bibliography: key → ready ДСТУ 8302:2015 string
  chapters/             Markdown, concatenated in lexical order
    00-abstract-uk.md  01-abstract-en.md  02-abbreviations.md  03-intro.md
    10-chapter1.md     11-chapter1-b.md   20-chapter2.md     30-chapter3.md
    39-chapter4-stack.md 40-chapter4-a.md 41-chapter4-b.md   50-chapter5.md   60-chapter6.md
    90-conclusions.md  95-references.md   A0-appendix-a.md  B0-appendix-b.md  C0-appendix-v.md
  diagrams/             <id>.puml + rendered <id>.png side by side (both committed)
  screenshots/          real UI screenshots from the user (PNG)
  tools/                build.sh, make_reference_docx.py, thesis.lua, wordcount.py (not `build/`: ignored by the root .gitignore)
  out/                  build output (git-ignored)
  .cache/               downloaded plantuml.jar + fonts (git-ignored)
```

A chapter may span several files (`40-…-a`, `41-…-b`) so two tickets never edit one file.
Only the first file of a chapter carries its `#` heading: `11-chapter1-b.md` (§1.3–1.4 + «Висновки
до розділу 1») continues `10-chapter1.md`; `39-chapter4-stack.md` holds `# 4 Програмна реалізація
системи` + §4.1, so `40-chapter4-a.md` starts at `## 4.2` and must not repeat `# 4`.

### 4.2 Toolchain decision

- **Markdown (pandoc dialect) → DOCX with pandoc 3.8** using a generated `reference.docx` that
  encodes §1 (styles: Normal/Body Text, Heading 1–3, Image Caption, Table Caption, Source Code,
  Compact, header with right-aligned PAGE field, section margins). DOCX is what the department
  edits; PDF/A is exported from Word by the user (§9 of the Regulations).
- **PlantUML 1.2026.8 jar on Java 21 (Temurin)**. pandoc and Java are pinned in the root
  `mise.toml` of `diploma`; the jar (sha256 `5e1ecfa8…c462`) and Liberation fonts 2.1.5 (sha256
  `7191c669…25d0`) are downloaded by `build.sh` into `.cache/`.
- **Sandbox constraints found and solved:** no Graphviz → every diagram starts with
  `!pragma layout smetana`; no system fonts/fontconfig → Java gets
  `-Dsun.awt.fontconfig=<generated fontconfig.properties>` pointing at Liberation fonts
  (Liberation Serif is metric-compatible with Times New Roman and has Cyrillic). Verified:
  a Cyrillic use-case diagram renders. Diagram font: `skinparam defaultFontName "Liberation Serif"`,
  `skinparam dpi 200` for print quality.
- **Numbering, captions, cross-references and bibliography by one Lua filter** (`tools/thesis.lua`)
  instead of pandoc-crossref/citeproc: no CSL for ДСТУ 8302 we can trust, and pandoc-crossref is
  pinned to exact pandoc versions. Bibliography strings are written pre-formatted in
  `sources.yaml`, so the filter only orders and numbers them.
- **Assembly / post-processing** (`tools/assemble.py`, python-docx): title page in the official
  Appendix_A template's styles filled from `metadata.yaml`, «different first page» so page 1 has
  no visible number, ЗМІСТ + TOC field before the first chapter-level element after the abstracts. The user then opens the DOCX in Word, updates
  fields (Ctrl+A, F9), does the manual table-continuation pass (§1.7) and exports PDF/A.

### 4.3 Markdown conventions (for writers)

```markdown
# 1 Аналіз предметної області та специфікація вимог      ← chapter: number typed by the writer
## 1.1 Аналіз предметної області                          ← subsection
## Висновки до розділу 1
# Вступ                                                    ← structural element (no number)

Архітектуру системи наведено на рис. @fig:components.     → «рис. 3.1»
Дані наведено у табл. @tbl:analogs; див. лістинг @lst:follower; за формулою @eq:ucp → «(2.1)»
… сервер-посередник SFU [@mediasoup-docs; @rfc8825].       → «[4, 5]»

![Діаграма компонентів системи](../diagrams/fig-components.png){#fig:components width=16cm}

: Порівняння наявних програмних рішень {#tbl:analogs}
| Функціональна можливість | stream-share | Twitch + OBS Studio | … |   ← developed app first, ≤ 4 analogs (§0.6)
|---|---|---|---|

```{#lst:follower .ts caption="Фрагмент класу SourceFollower"}
…verbatim code…
```

::: {#eq:ucp}
$$UCP = UAW + UUCW.$$
:::

::: {#sc:start-stream caption="Трансляція окремого застосунку"}   ← full template: §0.4
**Основна дійова особа:** …
:::
```

Prefixes: `fig:` Рисунок, `tbl:` Таблиця, `lst:` Лістинг, `eq:` formula, `sc:` Сценарій.
Any other `@key` is a source from `sources.yaml`. Numbers reset per chapter (taken from the
leading number of the current `#` heading; `А`, `Б` in appendices). Missing key = build error.
Placeholders for unknown facts: `[ПОТРЕБУЄ УТОЧНЕННЯ: …]` — the build lists them in a report.

`sources.yaml` entry:

```yaml
- key: mediasoup-docs
  text: "mediasoup v3 documentation. URL: https://mediasoup.org/documentation/v3/ (дата звернення: 05.10.2026)."
```

### 4.4 Build

`thesis/tools/build.sh` (stub committed with this plan): renders `diagrams/*.puml` → PNG,
generates `reference.docx`, runs pandoc on `chapters/*.md` with the Lua filter, writes
`out/thesis.docx`, and prints a words-per-chapter page estimate (240 words/page + item
allowances of §2) against the targets. Then `assemble.py` adds the title page, ЗМІСТ and header page
numbers. `build.sh --test` builds `tools/fixture/sample.md` and checks it with `tools/check_docx.py`;
usage is in `thesis/CLAUDE.md` «Build».

---

## 5. Gaps — data only the user can provide

| ID | Needed | Where used | Until provided |
| --- | --- | --- | --- |
| G1 | Title-page data: student name + surname, group code (e.g. «АС-2xx»), supervisor name, degree and title, consultants (if any), institute and department names (examples: ННІ комп'ютерних систем, Кафедра інженерії програмного забезпечення), specialty code/name (121 Інженерія програмного забезпечення?) and programme, year; patronymics for the bibliographic description; exact Ukrainian title as in the rector's order | title page, abstracts (Додаток Г template) | placeholders in `metadata.yaml` |
| G2 | Screenshots of the real UI (≈ 8–10, PNG, ≥ 1600 px wide): home, login, browser broadcast setup, desktop source picker, live broadcast, watch page as guest, private stream link, follow-mode switch, stream ended, desktop tray/update | Розділ 6.1 (and optionally 3.5) | `[ПОТРЕБУЄ УТОЧНЕННЯ: скриншот …]` |
| G3 | Whether the task form («Завдання на кваліфікаційну роботу») requires a graphical part / safety / economics section, and its exact content and calendar plan | structure, §1.14 | not planned |
| G4 | Execution of the functional test cases (actual result per case), OS/browser versions used | Розділ 5.2 | «фактичний результат» left as placeholder |
| G5 | Measured non-functional data: delivery latency (e.g. on-screen clock method), CPU/GPU load of the desktop app, achieved bitrate/fps per profile (`chrome://webrtc-internals`), number of concurrent viewers tried, network conditions | Розділ 5.3 | placeholders; no invented numbers |
| G6 | Approbation: any conference talk / publication about this work (full bibliographic data) | Вступ, source [1] | sentence omitted |
| G7 | The measurable goal of the work (e.g. «затримка доставки зображення глядачеві не перевищує N мс» or «час запуску трансляції окремого застосунку ≤ N с») and the operational-trial results that verify it (participants, conditions, numbers) | Вступ, Розділ 6.2, Загальні висновки | goal worded qualitatively + placeholder |
| G8 | Real project timeline: start/end dates of stages (git history starts 2026-05-27 with an «initialize» commit — confirm whether earlier work exists) | Розділ 2.2 (Gantt) | git dates used, flagged |
| G9 | Usage facts of the deployed service, if any (period online, number of streams/users) — only if real | Розділ 6 | omitted |
| G10 | Final steps only the user can do: update fields in Word, table-continuation labels, export **PDF/A**, sign with **КЕП**, bibliographic description via https://bo.op.edu.ua | delivery | — |
| G11 | Confirmation that the desktop app was tested on macOS (auto-update is wired only for Windows/Linux) and which OSes to claim as supported | Розділ 1.4, 5.3 | claim only what code/workflows show |

## 6. Truthfulness traps found in the code

- **Redis** runs in `infra/docker-compose.yml` (dev) but no application code uses it, and it is not
  in the production Compose → do not describe Redis as part of the system.
- `user` has `password_hash`, `failed_login_count`, `locked_until`; `audit_log` exists — but there
  is **no password sign-in and no audit writing** in code. Describe them as schema fields reserved
  for future use, or omit; never as features.
- The README marks «desktop app» unchecked although the app exists and ships via
  `desktop-release.yml` → describe what the code does.
- There are **no automated tests** and CI only builds artifacts → Розділ 5 must not claim unit /
  integration / e2e tests or coverage.
- Auto-update works on Windows and Linux only; installers are unsigned unless secrets exist.
- The codebase-overview context doc predates the system-browser Google sign-in for desktop
  (`googleAuth.ts`, `/api/desktop-auth/*`): the code is the authority.
