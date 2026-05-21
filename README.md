# FEG Stage PRO / PACK.IT

FEG Stage PRO — браузерное приложение для подготовки технических расчётов, смет, складских листов и проектной документации для event/technical production.

Рабочее направление продукта постепенно переводится в бренд **PACK.IT / ПАК.ИТ**, но в кодовой базе пока сохраняется историческое имя FEG Stage PRO.

## Текущий статус

- Текущий app package: `feg-stage-pro`.
- Текущая версия package: `3.17.50`.
- Активная ветка разработки: `main` + рабочие feature/cleanup branches через pull request.
- Текущий runtime: v4-only shell без старого видимого v3-интерфейса.
- Тип приложения: static/Vite browser app, PWA-ready.
- Backend-ready слой: Supabase adapters, migrations, sync queues, dry-run and controlled-write modules.

## Что умеет приложение

### Быстрые технические конструкторы

- Сцена.
- Фермы.
- LED-экраны.
- Быстрые технические листы и PDF-экспорт без клиентских цен.

### Линейный сметчик

- Клиент и проект.
- Объект / площадка.
- Состав сметы.
- Сцена, фермы, LED.
- Звук, свет, бэклайн, коммутация, услуги и ручные позиции.
- Транспорт.
- Команда проекта.
- Финальная клиентская и внутренняя сводка.

### Склад и операции

- База оборудования.
- Проверка наличия.
- Дефицит и закрытие субарендой.
- Складские листы.
- Резервы и движения склада как плановые операции.
- Warehouse operations hub.

### Документы и визуализация

- КП / клиентские документы.
- Технические листы.
- Складские листы.
- PDF / HTML / JSON exports.
- Top / front / isometric visual preview adapters.

### Управление и backend-readiness

- Auth shell и роли.
- Админка и управление доступом.
- Клиенты и проекты.
- Reports / Data Quality / Command Center.
- Supabase migrations, dry-run tools, sync queues and controlled-write preparation.

## Быстрый старт локально

```bash
npm install
npm run dev
```

По умолчанию dev server запускается через Vite.

Для проверки перед PR:

```bash
npm run check
npm run build
```

Дополнительно, если задача затрагивает e2e-сценарии:

```bash
npm run test:e2e
```

Для static preview/helper:

```bash
npm run preview
npm run serve:static
```

## Карта репозитория

```text
index.html                 Порядок загрузки browser-модулей и mount app shell
src/modules/               Runtime-модули приложения
src/modules/visual/        Visual model adapters and renderers
src/styles/main.css        Общий UI layer, tokens, shell layout, constructors UI
scripts/                   Static checks and helper scripts
supabase/migrations/       Supabase schema migrations
tests/e2e/                 Playwright checks
assets / icons / textures  PWA icons and constructor textures
docs/                      Активная документация и исторические заметки
CHANGELOG.md               Актуальная история релизов
```

## Главные входные файлы

- `index.html` — порядок подключения модулей и стартовая разметка.
- `src/modules/V4AppShell.js` — основной v4 shell.
- `src/modules/V4DesignSystem.js` — runtime-слой дизайн-системы.
- `src/styles/main.css` — главный CSS-файл проекта.
- `sw.js` — service worker и PWA cache.
- `manifest.json` — PWA manifest.

## Документация

Начинать лучше отсюда:

- `docs/README.md` — индекс документации.
- `docs/ARCHITECTURE.md` — архитектура и группы модулей.
- `docs/DEVELOPMENT.md` — локальная разработка и проверки.
- `docs/DOCUMENTATION_POLICY.md` — правила документации.
- `docs/CHANGELOG_POLICY.md` — правила changelog.
- `docs/UI_SYSTEM.md` — правила UI и технических canvas.
- `docs/CONSTRUCTORS.md` — правила Stage / Truss / LED конструкторов.
- `docs/BACKEND_CONTRACT.md` — backend/sync/auth/controlled-write правила.
- `docs/CLEANUP_AUDIT_2026_05_21.md` — аудит текущей чистки.

## Правила разработки

- `main` считается защищённой основной веткой.
- Рабочие изменения делаются в отдельной ветке.
- В `main` изменения попадают через pull request.
- Не смешивать UI-only правки с изменениями расчётов, BOM, склада, резервов или backend writes.
- Не добавлять inline styles и точечные CSS-костыли без необходимости.
- Общие визуальные изменения делать через tokens, shared classes и общий CSS.
- Не грузить test/demo fixtures в production entry.
- Не коммитить временные ТЗ, chat handoff, локальные архивы и служебный мусор.

## Защищённые зоны

Следующие области нельзя менять «заодно» во время документационной или UI-чистки:

- формулы Stage / Truss / LED;
- BOM quantities and normalized rows;
- складские движения и резервы;
- quote output / client totals;
- Supabase/backend controlled writes;
- PWA cache behavior без явного cache bump/review.

## История релизов

Краткая актуальная история находится в `CHANGELOG.md`.

Полный старый changelog до cleanup сохранён в Git history на baseline commit:

```text
df9da58b13fe9a769f38d439b549cbfb39b52f8d
```

## Cleanup note

Корневой `README.md` должен быть входной страницей проекта, а не свалкой release notes. История релизов хранится в `CHANGELOG.md`, долговечные правила — в `docs/`, временные задачи и chat handoff в репозиторий не добавляются.
