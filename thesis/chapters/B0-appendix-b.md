# Додаток Б Структура таблиць бази даних

У додатку наведено склад стовпців таблиць бази даних, описаних у підрозділі 3.3, за схемою модуля доступу до бази даних. Стовпці без обмеження NOT NULL допускають порожнє значення.

: Структура таблиці user {#tbl:db-user}

| Стовпець | Тип | Обмеження | Призначення |
|---|---|---|---|
| id | text | PK, UUID за замовчуванням | ідентифікатор користувача |
| email | varchar(512) | UNIQUE | адреса електронної пошти Google |
| emailVerified | timestamp | – | час підтвердження адреси (поле Auth.js) |
| name, image | varchar(255), text | – | ім'я та аватар |
| role | varchar | NOT NULL, user за замовчуванням | роль: user, admin, guest |
| status | varchar | NOT NULL, active за замовчуванням | стан: active, blocked, deleted |
| password_hash, failed_login_count, locked_until | text, integer, timestamptz | failed_login_count NOT NULL, 0 за замовчуванням | зарезервовано, функціональністю не використовується |
| created_at | timestamptz | NOT NULL, поточний час за замовчуванням | час створення |
| activeAt | timestamptz | поточний час за замовчуванням | час останньої активності гостя |

: Структура таблиці account {#tbl:db-account}

| Стовпець | Тип | Обмеження | Призначення |
|---|---|---|---|
| provider, providerAccountId | text | складений PK | провайдер і ідентифікатор користувача в ньому |
| userId | text | NOT NULL, FK → user.id | власник облікового запису |
| type | text | NOT NULL | тип облікового запису за Auth.js |
| access_token, refresh_token, id_token, expires_at, token_type, scope, session_state | text, integer | – | дані токенів провайдера OAuth |

: Структура таблиці stream {#tbl:db-stream}

| Стовпець | Тип | Обмеження | Призначення |
|---|---|---|---|
| id | text | PK, UUID за замовчуванням | ідентифікатор трансляції, частина посилання на перегляд |
| user_id | text | NOT NULL, FK → user.id | стрімер |
| isPrivate | boolean | false за замовчуванням | приватна трансляція не потрапляє до загального переліку |
| status | varchar | created за замовчуванням | стан (рис. @fig:state-stream) |
| endReason | varchar | – | streamer_stop, timeout, server_force, admin_force |
| startedAt, endedAt | timestamptz | startedAt – поточний час за замовчуванням | час початку й завершення |
| thumbnailUpdatedAt | timestamptz | – | час останнього оновлення мініатюри |

: Структура таблиці stream_to_user {#tbl:db-stream-to-user}

| Стовпець | Тип | Обмеження | Призначення |
|---|---|---|---|
| id | text | PK, UUID за замовчуванням | ідентифікатор запису |
| stream_id | text | NOT NULL, FK → stream.id | трансляція |
| user_id | text | NOT NULL, FK → user.id | глядач, підключений зараз |

: Структура таблиці audit_log {#tbl:db-audit-log}

| Стовпець | Тип | Обмеження | Призначення |
|---|---|---|---|
| id | uuid | PK, випадковий UUID за замовчуванням | ідентифікатор запису |
| actor_user_id | text | FK → user.id | автор дії |
| action, targetType, targetId | text | – | дія та її об'єкт |
| metadata | jsonb | – | додаткові дані |
| createdAt | timestamptz | поточний час за замовчуванням | час дії |
