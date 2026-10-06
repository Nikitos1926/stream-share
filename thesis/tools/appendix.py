#!/usr/bin/env python3
"""Generate chapters/A0-appendix-a.md («Додаток А Лістинг програми») verbatim from the pinned commit.

Code is read with `git show <COMMIT>:<path>`, so the appendix always matches the commit named in its
intro sentence (application code on `diploma` is identical to that commit). Omitted line ranges are
marked `// ...` (PLAN.md §1.9). Long lines are kept verbatim; Word wraps them.

Usage (from anywhere inside the repo):
  python3 thesis/tools/appendix.py          # rewrite chapters/A0-appendix-a.md
  python3 thesis/tools/appendix.py --check  # exit 1 if the file is stale
"""
import subprocess
import sys
from pathlib import Path

COMMIT = "7c2f481"
DATE = "25.09.2026"  # date of COMMIT; the text names the version by date, never by hash (§0.3)
THESIS = Path(__file__).resolve().parent.parent
OUT = THESIS / "chapters" / "A0-appendix-a.md"

# (id, language, path, line ranges (1-based, inclusive) or None for the whole file, caption,
#  lead-in naming the part by role — PLAN.md §0.3: never a file path in the text)
LISTINGS = [
    ("lst:a-source-follower", "ts", "apps/desktop/src/main/sourceFollower.ts", None,
     "Клас SourceFollower настільного застосунку",
     "клас слідування за вікнами застосунку в настільному застосунку"),
    ("lst:a-mediasoup", "ts", "apps/signaling/src/services/mediasoup.service.ts",
     [(1, 24), (41, 173)],
     "Клас MediasoupService сервера сигналізації (скорочено)",
     "сервіс сервера сигналізації, що створює процеси-обробники, маршрутизатори й транспорти "
     "mediasoup та обмежує їхній бітрейт"),
    ("lst:a-streams-ws", "ts", "apps/signaling/src/controllers/streams.controller.ts",
     [(66, 97), (239, 380), (468, 519)],
     "Маршрути та обробники WebSocket класу StreamsController (фрагмент)",
     "фрагмент контролера трансляцій сервера сигналізації з маршрутами та обробниками "
     "повідомлень WebSocket стрімера й глядача"),
    ("lst:a-use-streamer", "ts", "apps/web/src/lib/hooks/useStreamer.ts",
     [(29, 31), (86, 147), (331, 407)],
     "Хук useStreamer сторінки трансляції (скорочено)",
     "хук сторінки трансляції вебзастосунку, що керує захопленням і публікацією медіапотоків "
     "стрімера"),
    ("lst:a-google-auth", "ts", "apps/desktop/src/main/googleAuth.ts", [(1, 24), (71, 168)],
     "Вхід через Google у системному браузері в настільному застосунку (скорочено)",
     "модуль входу через Google у системному браузері головного процесу настільного "
     "застосунку"),
]

INTRO = f"""# Додаток А Лістинг програми

<!-- Generated from commit {COMMIT} by the appendix script in the thesis tools directory. Do not edit by hand. -->

У додатку наведено вихідний код ключових модулів програмної системи stream-share у версії від
{DATE}. Пропущені фрагменти (імпорти, допоміжний код, а також код, уже наведений в основній
частині роботи) позначено рядком коментаря з трикрапкою. Вихідні тексти всіх діаграм PlantUML,
наведених у роботі, зберігаються в репозиторії проєкту поруч із відповідними зображеннями.
"""


def source(path: str) -> list[str]:
    out = subprocess.run(["git", "show", f"{COMMIT}:{path}"], cwd=THESIS, check=True,
                         capture_output=True, text=True).stdout
    return out.rstrip("\n").split("\n")


def body(lines: list[str], ranges) -> list[str]:
    if ranges is None:
        return lines
    out: list[str] = []
    for i, (a, b) in enumerate(ranges):
        if i or a > 1:
            out.append("// ...")
        out.extend(lines[a - 1:b])
    if ranges[-1][1] < len(lines):
        out.append("// ...")
    return out


def render() -> str:
    parts = [INTRO]
    for ident, lang, path, ranges, caption, lead in LISTINGS:
        code = "\n".join(body(source(path), ranges))
        parts.append(f'\nДалі наведено {lead} (лістинг @{ident}).\n\n'
                     f'```{{#{ident} .{lang} caption="{caption}"}}\n{code}\n```\n')
    return "".join(parts)


def main() -> int:
    content = render()
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != content:
            print(f"{OUT.name} is stale: run thesis/tools/appendix.py")
            return 1
        return 0
    OUT.write_text(content, encoding="utf-8")
    print(f"wrote {OUT.relative_to(THESIS)}: {content.count(chr(10))} lines")
    return 0


if __name__ == "__main__":
    sys.exit(main())
