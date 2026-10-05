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
    h1 = style(doc, "Heading 1")
    set_font(h1, bold=True, caps=True)
    para(h1, align=WD_ALIGN_PARAGRAPH.CENTER, indent=0, after=21, keep_next=True)
    h1.paragraph_format.page_break_before = True
    # Heading 2/3: subsections — bold, at paragraph indent, sentence case.
    for n in (2, 3):
        h = style(doc, f"Heading {n}")
        set_font(h, bold=True, caps=False)
        para(h, align=WD_ALIGN_PARAGRAPH.LEFT, indent=12.5, before=21, after=21, keep_next=True)
        h.font.italic = False

    # Captions: figure below centred; table/listing above at indent.
    for name, align, indent in (("Image Caption", WD_ALIGN_PARAGRAPH.CENTER, 0),
                                ("Caption", WD_ALIGN_PARAGRAPH.CENTER, 0),
                                ("Table Caption", WD_ALIGN_PARAGRAPH.LEFT, 12.5)):
        s = style(doc, name)
        if s is not None:
            set_font(s)
            s.font.italic = False
            para(s, align=align, indent=indent, keep_next=(name == "Table Caption"))
    s = style(doc, "Captioned Figure")
    if s is not None:
        para(s, align=WD_ALIGN_PARAGRAPH.CENTER, indent=0, keep_next=True)

    # Code: Courier New 10, single spacing, flush left.
    # pandoc's default reference.docx lacks these two; pandoc uses them if present.
    for name, kind in (("Source Code", WD_STYLE_TYPE.PARAGRAPH),
                       ("Verbatim Char", WD_STYLE_TYPE.CHARACTER)):
        s = style(doc, name) or doc.styles.add_style(name, kind)
        set_font(s, name=CODE_FONT, size=10)
        if kind == WD_STYLE_TYPE.PARAGRAPH:
            para(s, align=WD_ALIGN_PARAGRAPH.LEFT, indent=0, spacing=1.0)

    # Formula line written by thesis.lua: <tab>formula<tab>(2.1) — centre tab mid-text, right tab
    # at the right margin (text width 210 − 25 − 10 = 175 mm).
    s = style(doc, "Formula") or doc.styles.add_style("Formula", WD_STYLE_TYPE.PARAGRAPH)
    s.base_style = style(doc, "Normal")
    set_font(s)
    para(s, align=WD_ALIGN_PARAGRAPH.LEFT, indent=0, before=6, after=6)
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
