#!/usr/bin/env python3
"""Generate pandoc's reference.docx carrying the thesis formatting (thesis/PLAN.md §1).

Starts from pandoc's own default reference.docx (so every style pandoc emits exists) and
restyles it with python-docx. Usage: make_reference_docx.py OUT.docx
Values come from the official DOCX templates in docs/formatting_examples (A4; margins
L25/R10/T20/B20 mm; Times New Roman 14; 1.5 spacing; first-line indent 12.5 mm).
"""
import subprocess
import sys
from pathlib import Path

from docx import Document
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Mm, Pt

FONT = "Times New Roman"
CODE_FONT = "Courier New"


def set_font(style, name=FONT, size=14, bold=None, caps=None):
    f = style.font
    f.name, f.size = name, Pt(size)
    f.color.rgb = None
    if bold is not None:
        f.bold = bold
    if caps is not None:
        f.all_caps = caps
    rpr = style.element.get_or_add_rPr()
    fonts = rpr.find(qn("w:rFonts"))
    if fonts is None:
        fonts = OxmlElement("w:rFonts")
        rpr.append(fonts)
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        fonts.set(qn(attr), name)
    for theme in ("w:asciiTheme", "w:hAnsiTheme", "w:cstheme", "w:eastAsiaTheme"):
        fonts.attrib.pop(qn(theme), None)


def para(style, align=WD_ALIGN_PARAGRAPH.JUSTIFY, indent=12.5, spacing=1.5,
         before=0, after=0, keep_next=False):
    pf = style.paragraph_format
    pf.alignment = align
    pf.first_line_indent = Mm(indent) if indent else Mm(0)
    pf.left_indent = Mm(0)
    pf.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE if spacing == 1.5 else WD_LINE_SPACING.SINGLE
    pf.space_before, pf.space_after = Pt(before), Pt(after)
    pf.keep_with_next = keep_next


def rule(style, sides):
    """0.5 pt single paragraph border(s), 4 pt from the text (scenario rules, PLAN.md §0.4).
    §0.4 measured 1 pt in Word; LibreOffice (the committed PDF) puts the 1.5-line leading above
    the text, so 1 pt drew the closing rule onto the descenders (1.2 pt gap). 4 pt keeps it clear."""
    ppr = style.element.get_or_add_pPr()
    for old in ppr.findall(qn("w:pBdr")):
        ppr.remove(old)
    bdr = OxmlElement("w:pBdr")
    for side in ("top", "bottom"):  # schema order: top, left, bottom, right, between, bar
        if side in sides:
            e = OxmlElement(f"w:{side}")
            for k, v in (("w:val", "single"), ("w:sz", "4"), ("w:space", "4"), ("w:color", "000000")):
                e.set(qn(k), v)
            bdr.append(e)
    # CT_PPrBase order: … keepNext, keepLines, pageBreakBefore, framePr, widowControl, numPr,
    # suppressLineNumbers, pBdr, shd, tabs, …, spacing, ind, … jc …
    later = {qn(t) for t in ("w:shd", "w:tabs", "w:suppressAutoHyphens", "w:kinsoku",
                             "w:wordWrap", "w:overflowPunct", "w:topLinePunct", "w:autoSpaceDE",
                             "w:autoSpaceDN", "w:bidi", "w:adjustRightInd", "w:snapToGrid",
                             "w:spacing", "w:ind", "w:contextualSpacing", "w:mirrorIndents",
                             "w:suppressOverlap", "w:jc", "w:textDirection", "w:textAlignment",
                             "w:textboxTightWrap", "w:outlineLvl", "w:divId", "w:cnfStyle",
                             "w:rPr", "w:sectPr", "w:pPrChange")}
    nxt = next((c for c in ppr if c.tag in later), None)
    if nxt is not None:
        nxt.addprevious(bdr)
    else:
        ppr.append(bdr)


def style(doc, name):
    return next((s for s in doc.styles if s.name == name), None)


def main(out: str) -> None:
    tmp = Path(out).with_suffix(".default.docx")
    subprocess.run(["pandoc", "-o", str(tmp), "--print-default-data-file", "reference.docx"],
                   check=True)
    doc = Document(str(tmp))
    tmp.unlink()

    for sec in doc.sections:
        sec.page_width, sec.page_height = Mm(210), Mm(297)
        sec.left_margin, sec.right_margin = Mm(25), Mm(10)
        sec.top_margin, sec.bottom_margin = Mm(20), Mm(20)
        sec.header_distance = Mm(10)

    for name in ("Normal", "Body Text", "First Paragraph"):
        s = style(doc, name)
        if s is not None:
            set_font(s)
            para(s)
    s = style(doc, "Compact")  # tight list items / table cells
    if s is not None:
        set_font(s)
        para(s, spacing=1.0, indent=0, align=WD_ALIGN_PARAGRAPH.LEFT)

    # Heading 1: chapters and structural elements — centred, bold, caps, new page.
    # Vertical gaps follow PLAN.md §0.5 «max, not sum»: a style carries only its `before`; the gap
    # *after* an element (heading, table, figure caption, formula, listing, scenario) is written
    # by assemble.py as `before` on the next paragraph (GAP_AFTER there). So every `after` is 0.
    h1 = style(doc, "Heading 1")
    set_font(h1, bold=True, caps=True)
    para(h1, align=WD_ALIGN_PARAGRAPH.CENTER, indent=0, keep_next=True)  # 21 pt after: assemble.py
    h1.paragraph_format.page_break_before = True
    # Heading 2/3: subsections — bold, at paragraph indent, sentence case; one empty line (24 pt)
    # before and after (§0.5; the «after» is set by assemble.py).
    for n in (2, 3):
        h = style(doc, f"Heading {n}")
        set_font(h, bold=True, caps=False)
        para(h, align=WD_ALIGN_PARAGRAPH.LEFT, indent=12.5, before=24, keep_next=True)
        h.font.italic = False

    # Captions (§0.5): figure caption below, centred, 6 pt under the image (24 pt after: assemble.py);
    # table/listing caption above at indent, one empty line (24 pt) before, object right under it.
    for name, align, indent, before in (("Image Caption", WD_ALIGN_PARAGRAPH.CENTER, 0, 6),
                                        ("Caption", WD_ALIGN_PARAGRAPH.CENTER, 0, 6),
                                        ("Table Caption", WD_ALIGN_PARAGRAPH.LEFT, 12.5, 24)):
        s = style(doc, name)
        if s is not None:
            set_font(s)
            s.font.italic = False
            para(s, align=align, indent=indent, before=before,
                 keep_next=(name == "Table Caption"))
    # Image paragraph: 24 pt before, single spacing so the image line is not inflated ×1.5.
    s = style(doc, "Captioned Figure")
    if s is not None:
        para(s, align=WD_ALIGN_PARAGRAPH.CENTER, indent=0, spacing=1.0, before=24, keep_next=True)

    # Code: Courier New 10, single spacing, flush left; 6 pt under the listing caption (§0.5).
    # pandoc's default reference.docx lacks these two; pandoc uses them if present. Verbatim Char
    # now only styles listings: thesis.lua renders inline code as plain body text (§0.2).
    for name, kind in (("Source Code", WD_STYLE_TYPE.PARAGRAPH),
                       ("Verbatim Char", WD_STYLE_TYPE.CHARACTER)):
        s = style(doc, name) or doc.styles.add_style(name, kind)
        set_font(s, name=CODE_FONT, size=10)
        if kind == WD_STYLE_TYPE.PARAGRAPH:
            para(s, align=WD_ALIGN_PARAGRAPH.LEFT, indent=0, spacing=1.0, before=6)

    # Use-case scenario (§0.4, thesis.lua): caption like a table caption (24 pt before), body flush
    # left without first-line indent, 0.5 pt rules at full text width above the first and below the
    # last body paragraph (24 pt after the closing rule: assemble.py).
    s = style(doc, "Scenario Caption") or doc.styles.add_style("Scenario Caption",
                                                                WD_STYLE_TYPE.PARAGRAPH)
    s.base_style = style(doc, "Normal")
    set_font(s)
    para(s, align=WD_ALIGN_PARAGRAPH.LEFT, indent=12.5, before=24, keep_next=True)
    for name, sides in (("Scenario", ()), ("Scenario First", ("top",)),
                        ("Scenario Last", ("bottom",)), ("Scenario Single", ("top", "bottom"))):
        s = style(doc, name) or doc.styles.add_style(name, WD_STYLE_TYPE.PARAGRAPH)
        s.base_style = style(doc, "Normal")
        set_font(s)
        para(s, indent=0, keep_next=(name == "Scenario First"))
        if sides:
            rule(s, sides)

    # Formula line written by thesis.lua: <tab>formula<tab>(2.1) — centre tab mid-text, right tab
    # at the right margin (text width 210 − 25 − 10 = 175 mm).
    s = style(doc, "Formula") or doc.styles.add_style("Formula", WD_STYLE_TYPE.PARAGRAPH)
    s.base_style = style(doc, "Normal")
    set_font(s)
    para(s, align=WD_ALIGN_PARAGRAPH.LEFT, indent=0, before=24)  # 24 pt after: assemble.py
    s.paragraph_format.tab_stops.add_tab_stop(Mm(87.5), WD_TAB_ALIGNMENT.CENTER)
    s.paragraph_format.tab_stops.add_tab_stop(Mm(175), WD_TAB_ALIGNMENT.RIGHT)

    # ЗМІСТ title (assemble.py) — looks like Heading 1 but is not a heading, so it stays out of
    # the TOC. TOC entries follow addendum_v: level 1 at 5 mm hanging, level 2 at 5 mm,
    # level 3 at 12.5 mm; page number at the right margin after a dot leader.
    s = style(doc, "TOC Title") or doc.styles.add_style("TOC Title", WD_STYLE_TYPE.PARAGRAPH)
    set_font(s, bold=True, caps=True)
    para(s, align=WD_ALIGN_PARAGRAPH.CENTER, indent=0, after=21, keep_next=True)
    s.paragraph_format.page_break_before = True
    for level, left, hanging in ((1, 5, 5), (2, 5, 0), (3, 12.5, 0)):
        name = f"toc {level}"  # Word's built-in name, so the TOC field uses it
        s = style(doc, name) or doc.styles.add_style(name, WD_STYLE_TYPE.PARAGRAPH, builtin=True)
        s.base_style = style(doc, "Normal")
        set_font(s)
        para(s, align=WD_ALIGN_PARAGRAPH.LEFT, indent=0)
        s.paragraph_format.left_indent = Mm(left)
        s.paragraph_format.first_line_indent = Mm(-hanging) if hanging else Mm(0)
        s.paragraph_format.right_indent = Mm(0)
        s.paragraph_format.tab_stops.add_tab_stop(Mm(175), WD_TAB_ALIGNMENT.RIGHT,
                                                  WD_TAB_LEADER.DOTS)

    # Header paragraph (assemble.py puts the PAGE field in it): right, no indent.
    s = style(doc, "Header") or doc.styles.add_style("Header", WD_STYLE_TYPE.PARAGRAPH, builtin=True)
    set_font(s)
    para(s, align=WD_ALIGN_PARAGRAPH.RIGHT, indent=0, spacing=1.0)

    # Table cells use "Compact" (single spacing, 14 pt, above). Header page number, title page
    # and TOC field are added by assemble.py.
    doc.save(out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "reference.docx")
