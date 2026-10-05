"""Export thesis.docx to PDF with LibreOffice, filling the ЗМІСТ and page fields first, and report
the page counts (PLAN.md §2 budget: main text ВСТУП … ЗАГАЛЬНІ ВИСНОВКИ 60–80 pp, total ≤ ~120).

Run with LibreOffice's bundled Python (tools/libreoffice.sh does that):
  python topdf.py IN.docx OUT.pdf [--docx OUT-with-toc.docx]
Page numbers come from the TOC LibreOffice generated, so they match the PDF. The PDF is a
preview with Liberation fonts (metric-compatible with Times New Roman / Courier New); the
original for submission is exported to PDF/A from Word by the author (Gap G10).
"""
import os
import re
import subprocess
import sys
import time

import uno
from com.sun.star.beans import PropertyValue


def prop(name, value):
    p = PropertyValue()
    p.Name, p.Value = name, value
    return p


def connect(soffice, profile):
    pipe = f"thesis{os.getpid()}"

    def launch():
        return subprocess.Popen([soffice, "--headless", "--invisible", "--norestore", "--nologo",
                                 f"-env:UserInstallation=file://{profile}",
                                 f"--accept=pipe,name={pipe};urp;"],
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    proc = launch()
    local = uno.getComponentContext()
    resolver = local.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", local)
    for _ in range(240):
        if proc.poll() == 81:  # fresh profile created: soffice.bin asks to be restarted
            proc = launch()
        try:
            ctx = resolver.resolve(f"uno:pipe,name={pipe};urp;StarOffice.ComponentContext")
            return proc, ctx.ServiceManager.createInstanceWithContext(
                "com.sun.star.frame.Desktop", ctx)
        except Exception:  # noqa: BLE001 — office still starting
            time.sleep(0.5)
    proc.kill()
    sys.exit("topdf.py: LibreOffice did not start")


def main(argv):
    src, out = os.path.abspath(argv[0]), os.path.abspath(argv[1])
    docx_out = os.path.abspath(argv[argv.index("--docx") + 1]) if "--docx" in argv else None
    soffice = os.environ["SOFFICE"]
    profile = os.environ.get("LO_PROFILE", os.path.join(os.path.dirname(out), ".lo-profile"))
    proc, desktop = connect(soffice, profile)
    try:
        doc = desktop.loadComponentFromURL(uno.systemPathToFileUrl(src), "_blank", 0,
                                           (prop("Hidden", True),))
        idx = doc.getDocumentIndexes()
        for _ in range(2):  # second pass: the TOC's own length shifts the page numbers
            for i in range(idx.getCount()):
                idx.getByIndex(i).update()
            doc.getTextFields().refresh()
            doc.refresh()
        pages = doc.getCurrentController().getPropertyValue("PageCount")
        toc = idx.getByIndex(0).getAnchor().getString() if idx.getCount() else ""
        doc.storeToURL(uno.systemPathToFileUrl(out), (prop("FilterName", "writer_pdf_Export"),))
        if docx_out:
            doc.storeToURL(uno.systemPathToFileUrl(docx_out),
                           (prop("FilterName", "MS Word 2007 XML"),))
        doc.close(True)
    finally:
        try:
            desktop.terminate()
        except Exception:  # noqa: BLE001 — bridge closes as the office exits
            pass
        proc.wait(timeout=60)
    report(toc, pages, out)


def report(toc, pages, out):
    entries = []  # (title, page) of level-1 entries, in order
    for line in toc.splitlines():
        m = re.match(r"(.+?)\t(\d+)$", line.strip())
        if m and not re.match(r"\d+\.\d", m.group(1)) and not m.group(1).startswith("Висновки до"):
            entries.append((m.group(1).strip(), int(m.group(2))))
    print(f"pdf: {os.path.basename(out)} — {pages} pages")
    if not entries:
        print("pdf: TOC not found, no page breakdown")
        return
    print(f"{'section':<62}{'pages':>6}{'from':>6}")
    nxt = [p for _, p in entries[1:]] + [pages + 1]
    main_from = main_to = None
    for (title, page), end in zip(entries, nxt):
        print(f"{title[:60]:<62}{end - page:>6}{page:>6}")
        if title.upper() == "ВСТУП":
            main_from = page
        if title.upper() == "ЗАГАЛЬНІ ВИСНОВКИ":
            main_to = end - 1
    if main_from and main_to:
        print(f"main text (ВСТУП … ЗАГАЛЬНІ ВИСНОВКИ): {main_to - main_from + 1} pages "
              f"(pp. {main_from}–{main_to}; target 60–80); total {pages} (≤ ~120)")


if __name__ == "__main__":
    main(sys.argv[1:])
