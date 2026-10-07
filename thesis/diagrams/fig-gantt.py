"""Діаграма Ганта проєкту (рис. 2.1, fig:gantt) -> fig-gantt.png поруч із цим файлом.

Оформлення повторює рис. 2.1 першого прикладу (docs/example_of_completed_work/exmaple1.pdf, с. 33):
таблиця «Задача | тривалість | місяці», темний заголовок, рядки етапів на сірому тлі зі світлою
зведеною смугою, під ними пронумеровані роботи з насиченими заокругленими смугами кольору етапу.
PlantUML такої компоновки не має, тому діаграму малює matplotlib (thesis/CLAUDE.md, «Diagrams»).

Дані – лише табл. 2.5 (tbl:wbs, розділ 2.2): номери, назви, терміни й тривалості робіт мають
збігатися з нею дослівно. Дата завершення роботи 9 ще не визначена, тому її смуга закінчується
останньою відомою датою (PLAN.md §0A.4), а тривалість показано як «–».

Запуск: bash thesis/tools/build.sh --diagrams-only (або <venv>/bin/python fig-gantt.py <каталог шрифтів>).
"""

import calendar
import sys
from datetime import date, timedelta
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib import font_manager  # noqa: E402
from matplotlib.patches import FancyBboxPatch, Rectangle  # noqa: E402

Y = 2026
# (етап, світлий колір зведеної смуги, колір смуг робіт, роботи)
# робота: (номер, назва з табл. 2.5, початок, кінець включно, тривалість у табл. 2.5)
STAGES = [
    ("Етап 1: Розробка вебсервісу", "#A3CDE9", "#85C1E9", [
        (1, "Створення каркаса системи та базової трансляції", (27, 5), (13, 7), "48"),
        (2, "Гостьовий доступ і керування трансляцією", (14, 7), (12, 8), "30"),
        (3, "Підготовка розгортання", (13, 8), (29, 8), "17"),
        (4, "Доопрацювання інтерфейсу", (30, 8), (3, 9), "5"),
    ]),
    ("Етап 2: Розробка настільного застосунку", "#9ED6B7", "#7DCEA0", [
        (5, "Захоплення окремих застосунків", (4, 9), (14, 9), "11"),
        (6, "Керування трансляцією, автооновлення та вхід через системний браузер",
         (15, 9), (19, 9), "5"),
        (7, "Оптимізація кодування відео", (20, 9), (20, 9), "1"),
        (8, "Режим слідування", (21, 9), (25, 9), "5"),
    ]),
    ("Етап 3: Тестування й документування", "#EFCE98", "#F7DC6F", [
        (9, "Тестування системи та оформлення пояснювальної записки", (5, 10), (7, 10), "–"),
    ]),
]
MONTHS = [5, 6, 7, 8, 9, 10]
MONTH_NAMES = {5: "Тра", 6: "Чер", 7: "Лип", 8: "Сер", 9: "Вер", 10: "Жов"}

# Геометрія в мм (рисунок вставляється шириною 16 см, тобто в масштабі 1:1).
W = 160.0
NAME_W, DUR_W = 60.0, 17.0
CHART_X = NAME_W + DUR_W
MONTH_W = (W - CHART_X) / len(MONTHS)
HEAD_H, ROW_H, ROW2_H = 8.5, 5.6, 8.6
BAR_H = 2.8
FS = 7.5  # pt
HEADER_BG, HEADER_FG = "#34495E", "white"
STAGE_BG, STAGE_LINE, GRID = "#ECF0F1", "#2C3E50", "#DDDDDD"
TEXT = "#222222"
WRAP = 44  # символів у рядку колонки «Задача»


def x_of(d: date) -> float:
    i = MONTHS.index(d.month)
    return CHART_X + MONTH_W * (i + (d.day - 1) / calendar.monthrange(d.year, d.month)[1])


def wrap(text: str, width: int) -> list[str]:
    lines, cur = [], ""
    for word in text.split():
        if cur and len(cur) + 1 + len(word) > width:
            lines.append(cur)
            cur = word
        else:
            cur = f"{cur} {word}".strip()
    return lines + [cur]


def main() -> None:
    fontdir = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    family = "Liberation Sans"
    if fontdir:
        for f in fontdir.glob("LiberationSans-*.ttf"):
            font_manager.fontManager.addfont(str(f))
    plt.rcParams["font.family"] = family

    rows = []  # (kind, label lines, duration, start, end, colour)
    for title, light, strong, works in STAGES:
        s = min(date(Y, m, d) for _, _, (d, m), _, _ in works)
        e = max(date(Y, m, d) for _, _, _, (d, m), _ in works)
        rows.append(("stage", [title], "", s, e, light))
        for n, name, (d1, m1), (d2, m2), dur in works:
            rows.append(("work", wrap(f"{n} {name}", WRAP), dur, date(Y, m1, d1), date(Y, m2, d2), strong))
    H = HEAD_H + sum(ROW_H if len(r[1]) == 1 else ROW2_H for r in rows)

    mm = 1 / 25.4
    fig = plt.figure(figsize=(W * mm, H * mm))
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, W)
    ax.set_ylim(H, 0)
    ax.set_aspect("equal")
    ax.axis("off")

    # заголовок
    ax.add_patch(Rectangle((0, 0), W, HEAD_H, color=HEADER_BG, lw=0))
    hdr = dict(color=HEADER_FG, fontsize=FS, fontweight="bold", ha="center", va="center")
    ax.text(NAME_W / 2, HEAD_H / 2, "Робота", **hdr)
    ax.text(NAME_W + DUR_W / 2, HEAD_H / 2, "Тривалість,\nдн.", linespacing=1.1, **hdr)
    for i, m in enumerate(MONTHS):
        ax.text(CHART_X + MONTH_W * (i + 0.5), HEAD_H / 2, f"{MONTH_NAMES[m]} {Y}", **hdr)
    for x in [NAME_W, CHART_X] + [CHART_X + MONTH_W * i for i in range(1, len(MONTHS))]:
        ax.plot([x, x], [0, HEAD_H], color="#5D6D7E", lw=0.5)

    y = HEAD_H
    for kind, lines, dur, s, e, colour in rows:
        h = ROW_H if len(lines) == 1 else ROW2_H
        if kind == "stage":
            ax.add_patch(Rectangle((0, y), W, h, color=STAGE_BG, lw=0))
        # сітка: межі колонок і місяців
        for x in [NAME_W, CHART_X] + [CHART_X + MONTH_W * i for i in range(1, len(MONTHS))]:
            ax.plot([x, x], [y, y + h], color=GRID, lw=0.5, zorder=1)
        bottom = STAGE_LINE if kind == "stage" else GRID
        ax.plot([0, W], [y + h, y + h], color=bottom, lw=1.0 if kind == "stage" else 0.5, zorder=2)

        cy = y + h / 2
        if kind == "stage":
            ax.text(1.2, cy, lines[0], fontsize=FS, fontweight="bold", color=TEXT, va="center")
        else:
            ax.text(3.5, cy, "\n".join(lines), fontsize=FS, color=TEXT, va="center", linespacing=1.15)
            ax.text(NAME_W + DUR_W / 2, cy, dur, fontsize=FS, color=TEXT, ha="center", va="center")

        x0, x1 = x_of(s), x_of(e + timedelta(days=1))
        bw = max(x1 - x0, 0.7)  # одноденна робота 7 лишається видимою
        r = min(0.8, bw / 2)
        ax.add_patch(FancyBboxPatch((x0 + r, cy - BAR_H / 2 + r), bw - 2 * r, BAR_H - 2 * r,
                                    boxstyle=f"round,pad={r}", color=colour, lw=0, zorder=3))
        y += h
    ax.add_patch(Rectangle((0, 0), W, H, fill=False, edgecolor=GRID, lw=0.8, zorder=4))

    out = Path(__file__).with_suffix(".png")
    fig.savefig(out, dpi=300, facecolor="white")
    print(f"rendered {out.name}")


if __name__ == "__main__":
    main()
