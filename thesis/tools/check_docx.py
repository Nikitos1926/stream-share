#!/usr/bin/env python3
"""Check the assembled fixture DOCX (tools/fixture/sample.md) against PLAN.md §1.

Run by `bash thesis/tools/build.sh --test`. Usage: check_docx.py out/fixture.docx
Exits non-zero listing every failed expectation.
"""
import sys

from docx import Document
from docx.oxml.ns import qn

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
failures = []


def expect(cond, what):
    if not cond:
        failures.append(what)


def text(el):
    return "".join(t.text or "" for t in el.iter(W + "t"))


def style_of(p):
    s = p.find(f"{W}pPr/{W}pStyle")
    return s.get(qn("w:val")) if s is not None else ""


def main(path):
    doc = Document(path)
    body = [e for e in doc.element.body if e.tag in (W + "p", W + "tbl")]  # skip bookmarks
    items = [(e.tag.split("}")[-1], style_of(e) if e.tag == W + "p" else "", text(e)) for e in body]
    texts = [t for _, _, t in items]
    styles = {s.get(f"{W}styleId"): s for s in doc.styles.element.findall(f"{W}style")}
    dflt = doc.styles.element.find(f"{W}docDefaults/{W}pPrDefault/{W}pPr/{W}spacing")

    def style_val(sid, side, depth=0):
        """Effective spacing `before`/`after` of a paragraph style (basedOn chain, docDefaults)."""
        st = styles.get(sid)
        sp = st.find(f"{W}pPr/{W}spacing") if st is not None else None
        if sp is not None and sp.get(f"{W}{side}") is not None:
            return int(sp.get(f"{W}{side}"))
        parent = st.find(f"{W}basedOn") if st is not None else None
        if parent is not None and depth < 20:
            return style_val(parent.get(f"{W}val"), side, depth + 1)
        return int(dflt.get(f"{W}{side}", "0")) if dflt is not None else 0

    def find(s, start=0):
        for i in range(start, len(items)):
            if items[i][2].strip() == s:
                return i
        failures.append(f"paragraph «{s}» not found")
        return -1

    def contains(s):
        expect(any(s in t for t in texts), f"text «{s}» not found")

    # Title page first, then АНОТАЦІЯ, ЗМІСТ (TOC field) before ВСТУП.
    expect(texts[0] == "МІНІСТЕРСТВО ОСВІТИ І НАУКИ УКРАЇНИ", "title page is not first")
    expect(items[0][1].startswith("TitlePage"), "title page does not use the template styles")
    for s in doc.styles.element.findall(f"{W}style"):
        if s.get(f"{W}styleId", "").startswith("TitlePage"):
            sp = s.find(f"{W}pPr/{W}spacing")
            expect(sp is not None and sp.get(f"{W}after") == "0" and sp.get(f"{W}before") == "0",
                   "title page styles must have no space before/after (page 1 overflows)")
    i_abs, i_toc, i_intro = find("Анотація"), find("Зміст"), find("Вступ")
    expect(i_abs < i_toc < i_intro, "order must be title, Анотація, Зміст, Вступ")
    expect(items[i_toc][1] == "TOCTitle", "ЗМІСТ title must use the TOC Title style")
    expect(items[i_abs][1] == "TOCTitle", "АНОТАЦІЯ must not be an outline heading (kept out of ЗМІСТ)")
    instr = " ".join(t.text for t in doc.element.body.iter(W + "instrText"))
    expect("TOC \\o" in instr, "TOC field missing")
    expect(doc.settings.element.find(qn("w:updateFields")) is not None, "updateFields missing")

    # Every chapter / structural element starts on a new page.
    expect(doc.styles["Heading 1"].paragraph_format.page_break_before, "Heading 1 lacks page break")
    expect(body[i_abs].find(f"{W}pPr/{W}pageBreakBefore") is not None or
           items[i_abs][1] in ("Heading1", "TOCTitle"), "first element after title page not on a new page")

    # Figures: caption below the image, centred style; per-chapter numbering; appendix letter.
    for cap in ("Рисунок 1.1 – Перший рисунок", "Рисунок 2.1 – Другий рисунок",
                "Рисунок А.1 – Рисунок додатка"):
        i = find(cap)
        if i > 0:
            expect(items[i][1] == "ImageCaption", f"«{cap}» is not an Image Caption")
            expect(body[i - 1].find(f".//{W}drawing") is not None, f"no image above «{cap}»")
    # Tables: caption above the table.
    for cap in ("Таблиця 1.1 – Перша таблиця", "Таблиця 2.1 – Друга таблиця"):
        i = find(cap)
        if i >= 0:
            expect(items[i][1] == "TableCaption", f"«{cap}» is not a Table Caption")
            expect(items[i + 1][0] == "tbl", f"no table right below «{cap}»")
            if items[i + 1][0] == "tbl":
                tbl = body[i + 1]
                expect(tbl.find(f"{W}tblPr/{W}tblBorders/{W}insideV") is not None,
                       f"table under «{cap}» is not ruled")
                grid = sum(int(g.get(qn("w:w"))) for g in tbl.iter(f"{W}gridCol"))
                expect(grid == 9921, f"table under «{cap}» is {grid} twips wide, not 175 mm")
                first = tbl.find(f"{W}tr/{W}tc/{W}p/{W}pPr/{W}jc")
                expect(first is not None and first.get(qn("w:val")) == "center",
                       f"header row of the table under «{cap}» is not centred")
    # Listing: caption above the code.
    i = find("Лістинг 1.1 – Перший лістинг з методом answer")
    if i >= 0:
        expect(items[i][1] == "TableCaption", "listing caption style")
        expect(items[i + 1][1] == "SourceCode" and "answer" in texts[i + 1], "no code below listing")
    # Formulas: Formula style, number at the right after a tab.
    for num in ("(1.1)", "(2.1)"):
        hits = [k for k, (_, st, t) in enumerate(items) if st == "Formula" and t.endswith(num)]
        expect(len(hits) == 1, f"formula {num} missing")
        if hits:
            expect(len(list(body[hits[0]].iter(W + "tab"))) == 2, f"formula {num} lacks tabs")
            expect(body[hits[0]].find(".//{http://schemas.openxmlformats.org/officeDocument/2006/math}oMath")
                   is not None, f"formula {num} is not OMML")
    # Scenarios (PLAN.md §0.4): own caption style, typed step numbers, rules on first/last body
    # paragraph (a one-paragraph scenario has both).
    for cap, body_styles in (("Сценарій 1.1 – Перший сценарій",
                              ["ScenarioFirst"] + ["Scenario"] * 6 + ["ScenarioLast"]),
                             ("Сценарій 1.2 – Другий сценарій", ["ScenarioSingle"])):
        i = find(cap)
        if i >= 0:
            expect(items[i][1] == "ScenarioCaption", f"«{cap}» caption style")
            got = [st for _, st, _ in items[i + 1:i + 1 + len(body_styles)]]
            expect(got == body_styles, f"«{cap}» body styles {got}")
    i = find("1. Гість натискає кнопку.")
    expect(i >= 0 and body[i].find(f".//{W}numPr") is None, "scenario steps must be typed, not a list")
    find("2а.1. Система показує помилку. Повернення до п. 1.")
    for sid, sides in (("ScenarioFirst", {"top"}), ("ScenarioLast", {"bottom"}),
                       ("ScenarioSingle", {"top", "bottom"}), ("Scenario", set())):
        st = styles.get(sid)
        bdr = st.find(f"{W}pPr/{W}pBdr") if st is not None else None
        got = {e.tag.split("}")[-1] for e in bdr} if bdr is not None else set()
        expect(got == sides, f"style {sid} borders {got}, expected {sides}")
        ind = st.find(f"{W}pPr/{W}ind") if st is not None else None
        expect(ind is not None and ind.get(f"{W}firstLine", "0") == "0",
               f"style {sid} must have no first-line indent")

    # Inline code is plain body text (§0.2); only listings use the code font.
    contains("Інлайн-код useSourceFollower має")
    contains("setDisplayMediaRequestHandler")
    for k, e in enumerate(body):
        if items[k][1] != "SourceCode" and e.find(f".//{W}rStyle[@{W}val='VerbatimChar']") is not None:
            failures.append(f"inline code styling left in «{items[k][2][:40]}»")

    # Vertical spacing (§0.5), twips: 24 pt = 480, 6 pt = 120. Gaps are `before` on the next
    # paragraph, every `after` is 0 («max, not sum»).
    def gap(k, side):
        sp = body[k].find(f"{W}pPr/{W}spacing")
        if sp is not None and sp.get(f"{W}{side}") is not None:
            return int(sp.get(f"{W}{side}"))
        return style_val(items[k][1] or "Normal", side)

    def first(st, start=0):
        return next((k for k in range(start, len(items)) if items[k][1] == st), -1)

    for k, (kind, st, t) in enumerate(items):
        if kind == "p" and not st.startswith("TitlePage") and st != "TOCTitle":
            expect(gap(k, "after") == 0, f"«{t[:30]}» ({st}) has space after {gap(k, 'after')}")
    i_fig = first("CaptionedFigure")
    expect(gap(i_fig, "before") == 480, "figure: 24 pt before")
    sp = styles["CaptionedFigure"].find(f"{W}pPr/{W}spacing")
    expect(sp is not None and sp.get(f"{W}line") == "240", "figure paragraph must be single-spaced")
    expect(gap(i_fig + 1, "before") == 120, "figure caption: 6 pt before")
    expect(gap(i_fig + 2, "before") == 480, "after figure caption: 24 pt")
    i_tc = find("Таблиця 1.1 – Перша таблиця")
    expect(gap(i_tc, "before") == 480, "table caption: 24 pt before")
    expect(gap(i_tc + 2, "before") >= 480, "after table: 24 pt")
    i_lst = first("SourceCode")
    expect(gap(i_lst - 1, "before") == 480, "listing caption: 24 pt before")
    expect(gap(i_lst, "before") == 120, "listing code: 6 pt under its caption")
    expect(gap(i_lst + 1, "before") == 480, "after listing: 24 pt")
    i_eq = first("Formula")
    expect(gap(i_eq, "before") == 480 and gap(i_eq + 1, "before") == 480,
           "formula: 24 pt before and after (also before «де …»)")
    i_sc = first("ScenarioCaption")
    expect(gap(i_sc, "before") == 480, "scenario caption: 24 pt before")
    i_end = first("ScenarioSingle")
    expect(gap(i_end + 1, "before") == 480, "after scenario: 24 pt")
    i_h2 = first("Heading2")
    expect(gap(i_h2, "before") == 480 and gap(i_h2 + 1, "before") == 480,
           "Heading 2: 24 pt before and after")
    for st in ("TableCaption", "CaptionedFigure", "ScenarioCaption", "ScenarioFirst"):
        expect(styles[st].find(f"{W}pPr/{W}keepNext") is not None, f"{st} must keep with next")

    # Cross-references and citations in the text.
    for s in ("(рис. 1.1)", "(табл. 1.1)", "(див. лістинг 1.1)", "формула (1.1)",
              "сценарії 1.1–1.2", "[3, с. 15]", "(табл. 2.1)", "(рис. 2.1)", "рис. А.1",
              "джерело [1] і", "одразу [1, 2]."):
        contains(s)
    expect(not any("@" in t and ("fig:" in t or "tbl:" in t) for t in texts), "unresolved @refs")

    # Reference list: under its heading, order of first citation.
    i = find("Список використаних джерел")
    if i >= 0:
        expect(texts[i + 1].startswith("1. Pantos R."), "source 1 must be rfc8216")
        expect(texts[i + 2].startswith("2. WebRTC: Real-Time"), "source 2 must be w3c-webrtc")
        expect(texts[i + 3].startswith("3. Alvestrand H."), "source 3 must be rfc8825")
        expect(texts[i + 4].strip().lower().startswith("додаток"), "only cited sources are listed")

    # Appendix heading: «ДОДАТОК А», line break, title not in caps (PLAN.md §1.4).
    app = [e for e in body if style_of(e) == "Heading1" and text(e).lower().startswith("додаток")]
    expect(len(app) == 1, "appendix heading missing")
    if app:
        expect(app[0].find(f".//{W}br") is not None, "appendix title not on its own line")
        expect(app[0].find(f".//{W}caps[@{W}val='0']") is not None, "appendix title must not be caps")

    # Page numbers: header PAGE field, right-aligned; title page counted but blank.
    sec = doc.sections[0]
    expect(sec.different_first_page_header_footer, "title page must have a different header")
    hdr = " ".join(t.text for t in sec.header._element.iter(W + "instrText"))
    expect("PAGE" in hdr, "header has no PAGE field")
    expect(sec.header.paragraphs[0].alignment == 2, "page number not right-aligned")  # RIGHT
    expect(not list(sec.first_page_header._element.iter(W + "instrText")),
           "title page header must be empty")

    if failures:
        print("check_docx: FAILED\n  " + "\n  ".join(failures), file=sys.stderr)
        sys.exit(1)
    print(f"check_docx: {path} OK")


if __name__ == "__main__":
    main(sys.argv[1])
