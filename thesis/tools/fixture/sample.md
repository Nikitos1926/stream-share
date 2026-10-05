<!-- Toolchain fixture: one of every element type. Built by `bash thesis/tools/build.sh --test`
     and checked by tools/check_docx.py — keep the two in sync. Not part of the thesis. -->

# Анотація

Текст анотації.

# Вступ

Вступ цитує джерело [@rfc8216] і два джерела одразу [@w3c-webrtc; @rfc8216].

# 1 Перший розділ

## 1.1 Об'єкти розділу

**1.1.1 Посилання.** Рисунок (рис. @fig:first), таблиця (табл. @tbl:first), лістинг (див. лістинг
@lst:first), формула @eq:first, сценарії @sc:first–@sc:second і джерело зі сторінкою
[@rfc8825, с. 15].

![Перший рисунок](../../diagrams/fig-topologies.png){#fig:first width=8cm}

Пояснення до рисунка.

: Перша таблиця {#tbl:first}

| Стовпець | Значення |
|---|---|
| a | 1 |

```{#lst:first .ts caption="Перший лістинг"}
const answer = 42;
```

::: {#eq:first}
$$E = PF \cdot UCP,$$
:::

де $PF$ – коефіцієнт продуктивності.

::: {#sc:first caption="Перший сценарій"}
**Основна дійова особа:** гість.
:::

::: {#sc:second caption="Другий сценарій"}
**Основна дійова особа:** користувач.
:::

## Висновки до розділу 1

Висновки.

# 2 Другий розділ

## 2.1 Скидання нумерації

Друга таблиця (табл. @tbl:second) і рисунок (рис. @fig:second), посилання вперед на рис. @fig:appendix.

: Друга таблиця {#tbl:second}

| A | B |
|---|---|
| 1 | 2 |

![Другий рисунок](../../diagrams/fig-gantt.png){#fig:second width=8cm}

::: {#eq:second}
$$UCP = UAW + UUCW.$$
:::

## Висновки до розділу 2

Висновки.

# Список використаних джерел

# Додаток А Лістинг програми

![Рисунок додатка](../../diagrams/fig-use-cases.png){#fig:appendix width=8cm}
