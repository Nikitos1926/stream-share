Last full check: 2026-10-10, re-assembly after the two parallel revisions (two actors Гість/Користувач; NFR, goal, group АС-234),
`build.sh --release` with `THESIS_STRICT=1` (qa.py and `references.py --check` pass). Each later revision re-runs it and updates this file; qa.py copies
it into OPEN_ITEMS.md.

| Правило | Результат |
| --- | --- |
| PLAN.md §0.7 greps 1–7 (no x.y.z headings or points, no inline code, paths or italic identifiers, E2 scenario labels, stream-share in tbl:analogs) | 0 hits each; tbl:analogs → 1 |
| §0.7 grep 8 (Latin in «») | UI labels and the «include» stereotype only (the diagram has no «extend») |
| §0A.6.1 level-1 headings in UPPER CASE | all 13; appendix «ДОДАТОК А Лістинг програми» |
| §0A.6.2 no «(розділ N)», «підрозділ x.y» pointers | 0 hits |
| §0A.4 no Git/VCS/repository/commit in chapter 2 | 0 hits; nine works 27.05–25.09.2026 |
| §0A.6.4 «за наказом» | only the official form line of the task sheet |
| §0A.8 use cases | 2 actors Гість ◁ Користувач (+ Google), 14 use cases in 3 packages, 14 scenarios (sc:sign-in … sc:end-reconnect); Join «include» Play; «Перейти … за посиланням» (Гість) and «Обрати … в переліку» (Користувач only) specialise Join; capture variants by generalisation; justified under fig. 1.2; no Стример/Глядач actor anywhere (стример/глядач only as roles in prose); actor names in the scenarios: «Гість», «Користувач», «гість або користувач» for the abstract Join; diagram, scenarios, tbl:requirements and the code agree (guest: watch page only; list only for non-guests) |
| §0A.2 + §0A.8 UCP | E2 = E3 = E7 = 0 with a justification column; UAW 8, UUCW 165 (5 complex, 9 average – transaction counts match the 14 scenarios), UCP ≈ 204,2, ≈ 5718 люд.-год in ch. 2 and the conclusions; the abstracts give no UCP figure |
| Нефункціональні вимоги (2026-10-10) | six categories in the format of example E1, no IDs, no implementation detail; 30 с, 1,5 с, 3840×2160/60 кадр/с match the code; tbl:nfr rows test them (30 с → З2, 1,5 с → Д3, owner-only control → А7, Б5, З4); the conclusions name the same six categories |
| §0A.3 goal | «Метою роботи є підвищення ефективності трансляції окремих застосунків шляхом розроблення вебсервісу…» identical in ВСТУП, АНОТАЦІЯ (ABSTRACT = translation), task sheet and ЗАГАЛЬНІ ВИСНОВКИ; 1,5 с in ch. 5, 6 and the conclusions |
| §0A.5 references | 30 sources, all cited, numbered by first citation; the NFR rewrite had changed the first-citation order (sources 24–28) without regenerating the list – regenerated, and strict builds now run `references.py --check` |
| DB tables (2026-10-07) | tables 3.2–3.6 right after fig. 3.8 (ER): user, account, stream, stream_to_user, audit_log, which are all the tables of the DB schema |
| Single appendix | only «ДОДАТОК А Лістинг програми», listings А.1–А.5 |
| Title page / supervisor / group | data of §0A.6.3; topic in sentence case; Керівник Андрій ЛАПАЄВ; група АС-234 on the title page (PDF p. 1) and the task sheet, no group placeholder left |
| Gantt (first-example style) | fig. 2.1 on p. 39, three stages, nine works = tbl:wbs |
| Abstracts on one page | АНОТАЦІЯ alone on p. 2, ABSTRACT alone on p. 3 |
| Abstract counts | 107 с.; main text 80 pp; 30 sources on 3 pp; one appendix on 17 pp (= pages.txt). The Regulations template and both examples give no figure or table counts (the document has 22 figures and 23 tables) |
| Numbering and captions | figures 1.1–6.6 (22), tables 1.1–6.1 (23), listings 4.1–4.8 and А.1–А.5: consecutive per chapter, each referenced before it appears (qa.py); no unresolved «??» |
| Volume | main text 80 pp (8–87), within 60–80; total 107, at most ~120. Per section: ВСТУП 3, ch. 1 22, ch. 2 8, ch. 3 18, ch. 4 15, ch. 5 7, ch. 6 5, ВИСНОВКИ 2, sources 3, appendix 17. On 2026-10-10 two listings (4.3, 4.4) moved to А.1/А.2 and the theme screenshot placeholder was dropped to stay within 80 |
