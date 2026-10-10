Last full check: 2026-10-07, `build.sh --release` with `THESIS_STRICT=1` (qa.py and
`references.py --check` pass). Each later revision re-runs it and updates this file; qa.py copies
it into OPEN_ITEMS.md.

| Правило | Результат |
| --- | --- |
| PLAN.md §0.7 greps 1–7 (no x.y.z headings or points, no inline code, paths or italic identifiers, E2 scenario labels, stream-share in tbl:analogs) | 0 hits each; tbl:analogs → 1 |
| §0.7 grep 8 (Latin in «») | UI labels and the «include»/«extend» stereotypes only |
| §0A.6.1 level-1 headings in UPPER CASE | all 13; appendix «ДОДАТОК А Лістинг програми» |
| §0A.6.2 no «(розділ N)», «підрозділ x.y» pointers | 0 hits |
| §0A.4 no Git/VCS/repository/commit in chapter 2 | 0 hits; nine works 27.05–25.09.2026 |
| §0A.6.4 «за наказом» | only the official form line of the task sheet |
| §0A.8 use cases | 13 use cases in 3 packages, 13 scenarios (sc:sign-in … sc:end-reconnect); Join «include» Play, «Обрати трансляцію в переліку…» «extend» Join at «вибір трансляції», capture variants by generalisation, justified under fig. 1.2 |
| §0A.2 + §0A.8 UCP | E2 = E3 = E7 = 0 with a justification column; UAW 11, UUCW 160, UCP ≈ 201,8, ≈ 5652 люд.-год in ch. 2 and the conclusions |
| §0A.3 goal | identical wording in ВСТУП and both abstracts; 1,5 с in ch. 5, 6 and the conclusions |
| §0A.5 references | 30 sources, all cited, numbered by first citation |
| DB tables (2026-10-07) | tables 3.2–3.6 right after fig. 3.8 (ER): user, account, stream, stream_to_user, audit_log, which are all the tables of the DB schema |
| Single appendix | only «ДОДАТОК А Лістинг програми», listings А.1–А.5 |
| Title page / supervisor | data of §0A.6.3; topic in sentence case; Керівник Андрій ЛАПАЄВ |
| Gantt (first-example style) | fig. 2.1 on p. 35, three stages, nine works = tbl:wbs |
| Abstracts on one page | АНОТАЦІЯ alone on p. 2, ABSTRACT alone on p. 3 |
| Abstract counts | 107 с.; main text 80 pp; 30 sources on 3 pp; one appendix on 17 pp (= pages.txt). The Regulations template and both examples give no figure or table counts (the document has 23 figures and 24 tables) |
| Numbering and captions | figures 1.1–6.6 (23), tables 1.1–6.1 (24), listings 4.1–4.10 and А.1–А.5: consecutive per chapter, each referenced before it appears (qa.py); no unresolved «??» |
| Volume | main text 80 pp (8–87), within 60–80; total 107, at most ~120 |
