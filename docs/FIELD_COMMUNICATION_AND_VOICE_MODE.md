# Field communication and voice mode

Этот документ фиксирует будущий модуль полевой коммуникации Pack.it: чаты, голосовую связь, on-site LAN mode и работу на площадке без интернета.

## Главный принцип

Для техпродакшена важно, чтобы команда могла координироваться на площадке даже при отсутствии интернета.

Pack.it должен поддерживать сценарий:

```text
площадка без интернета
    ↓
локальная сеть через роутер / OpenWRT / мини-ПК / локальный сервер
    ↓
команда подключается телефонами/планшетами/ноутбуками
    ↓
работают локальные чаты, голосовая связь, задачи и статусы
    ↓
при появлении интернета данные синхронизируются с основной company installation
```

Это не заменяет основную company installation, а является полевым on-site режимом.

## Product value

Field communication может стать одной из ключевых практических функций Pack.it, потому что закрывает реальную боль площадки:

- не везде есть интернет;
- не всегда хватает раций;
- интеркомы и радиосвязь требуют отдельного комплекта;
- команда часто разбита по зонам;
- связь голосом нужна прямо во время монтажа;
- после монтажа полезно иметь историю событий, задач, фото и решений.

Pack.it field mode должен уменьшать количество отдельных средств связи на небольших и средних проектах и давать команде единый локальный канал коммуникации, связанный с проектом, задачами и документами.

## Field Voice as radio/intercom alternative

Field Voice Mode может частично заменить необходимость таскать отдельные рации, простые интеркомы и бытовые средства связи.

Подходит для:

- небольших и средних мероприятий;
- load-in/load-out координации;
- связи между складом, сценой, LED, звуком, светом и транспортом;
- быстрых голосовых команд техдира;
- временных voice rooms по ролям;
- локальной связи внутри площадки без интернета;
- случаев, где у каждого участника уже есть телефон.

Преимущества перед обычными рациями:

- не нужен отдельный парк раций для каждого проекта;
- можно использовать телефоны команды;
- можно разделять voice rooms по ролям;
- можно связать голосовую команду с проектом/задачей;
- можно иметь историю voice notes, сообщений, фото и статусов;
- можно синхронизировать события с основной company installation;
- можно выдавать временный доступ приглашённым специалистам через QR/access key.

Но Pack.it не должен обещать полную замену профессиональной аварийной/сценической связи в критичных условиях.

Fallback обязателен для:

- safety-critical команд;
- больших сцен;
- пиротехники/опасных работ;
- кранов/подъёмников/риггинга с высоким риском;
- шоу с жёстким show-call/intercom workflow;
- ситуаций, где по регламенту нужны сертифицированные средства связи.

Правильная позиция продукта:

```text
Pack.it Field Voice уменьшает потребность в рациях/интеркомах и может заменить их в части рабочих сценариев, но для критичной безопасности должен быть fallback: рации, интерком, проводная связь или другой утверждённый канал.
```

## Связь с основными модулями

Field communication связан с:

- Project;
- ProjectTask;
- ProjectAssignment;
- Notification Policy;
- Offline/PWA contract;
- Access Control;
- Audit Log;
- Warehouse Workflow;
- Documents and Visibility;
- first real company deployment.

## Что уже покрыто общей архитектурой

В базовых документах уже есть:

- проектные задачи;
- проектные роли;
- уведомления;
- project events;
- offline queue;
- project comments/chat as future direction;
- access keys;
- PWA offline behavior.

Но field voice/LAN mode требует отдельного правила, потому что это другой уровень работы: локальная сеть на площадке, связь без интернета, временный edge-server и последующая синхронизация.

## Сценарии использования

### 1. Площадка без интернета

На площадке нет стабильного интернета, но есть локальная сеть.

Возможная схема:

```text
OpenWRT router / обычный router
        ↓
локальная Wi-Fi сеть проекта
        ↓
телефоны/планшеты/ноутбуки команды
        ↓
локальный Pack.it field server или voice relay
```

### 2. Роутер с сервером на борту

Например:

- OpenWRT router;
- роутер с USB storage;
- роутер с контейнером/лёгким сервисом;
- mini edge node.

Используется для:

- локального discovery;
- локального статуса площадки;
- лёгкого text/chat relay;
- voice relay, если железо тянет;
- локального кэша задач/плана.

### 3. Роутер + ПК / mini PC / TV box

Более надёжный вариант:

```text
Router/OpenWRT
        ↓
Mini PC / notebook / TV box / NUC
        ↓
local field server
        ↓
phones/tablets connect over LAN
```

Mini PC может держать:

- local Pack.it field server;
- локальную БД/очередь;
- voice server/relay;
- static PWA;
- локальные документы проекта;
- sync agent.

### 4. Интернет появляется позже

Полевой сервер копит события локально.

После появления интернета:

```text
local field queue
    ↓
sync to company installation
    ↓
conflict resolution
    ↓
project events / tasks / comments / files updated
```

## Типы коммуникации

### Text chat

Текстовые чаты:

- общий чат проекта;
- чат роли/бригады;
- чат склада/погрузки;
- чат сцены;
- чат ферм/риггинга;
- чат LED;
- чат звука;
- чат света;
- чат транспорта;
- личные сообщения, если разрешено.

### Voice mode

Голосовой режим нужен для быстрых команд на площадке.

Варианты:

- push-to-talk;
- voice rooms by role;
- общий voice room проекта;
- emergency/broadcast channel;
- temporary voice room for task/zone;
- listen-only announcements.

### Voiceover / field announcement mode

Отдельный режим: голосовые объявления/команды на площадке.

Пример:

```text
Техдир нажимает кнопку
    ↓
говорит голосовое объявление
    ↓
его слышит нужная роль или вся команда
```

Возможные каналы:

- all crew;
- warehouse/load-in;
- rigging/truss;
- LED;
- sound;
- light;
- transport;
- emergency.

## Приоритеты голоса

Голосовые каналы должны иметь приоритеты:

1. Emergency / safety.
2. Technical director broadcast.
3. Stage/rigging critical commands.
4. Warehouse/load-in coordination.
5. Role-room voice.
6. Regular chat voice notes.

Emergency/broadcast не должен теряться в обычном шуме.

## Offline/LAN access

Пользователь на площадке должен подключаться через:

- QR-код проекта;
- local project access key;
- temporary field access token;
- local Wi-Fi captive page;
- known company/project code.

Доступ должен быть ограничен:

- companyId;
- projectId;
- userId or guestId;
- project role;
- validFrom/validUntil;
- local installation/session id;
- allowed communication rooms.

## Field server identity

Полевой сервер должен иметь временную идентичность:

```text
fieldSessionId
companyId
projectId
parentInstallationId
startedBy
startedAt
localNetworkName
syncStatus
```

Он не является отдельной company installation. Это временный edge/session node для конкретной площадки или проекта.

## Local data scope

На field server нельзя тащить всю базу компании.

Туда можно синхронизировать только нужное для проекта:

- project summary;
- task list;
- crew assignments;
- role list;
- selected documents;
- warehouse/pick/load-in list;
- site checklist;
- emergency contacts;
- communication rooms;
- latest relevant comments;
- local files/photos for this project.

Нельзя по умолчанию копировать:

- всю клиентскую базу;
- весь склад;
- все проекты компании;
- финансовую аналитику;
- license secrets;
- central registry data;
- чужие проекты;
- лишние персональные данные.

## Sync model

Field communication работает через local queue.

События:

- text message created;
- voice note created;
- voice room event;
- task status changed;
- checklist item completed;
- photo uploaded;
- warehouse load-in status changed;
- incident/safety event;
- user joined/left field network.

Каждое событие должно иметь:

```text
companyId
projectId
fieldSessionId
localEventId
actorUserId / guestId
timestamp
roomId / taskId / sectionId
payload
syncStatus
```

## Conflict handling

При синхронизации возможны конфликты.

Примеры:

- задача закрыта локально, но уже изменена в основной базе;
- складская отметка сделана двумя пользователями;
- комментарии пришли в разном порядке;
- пользователь потерял доступ во время полевой сессии;
- документ устарел.

Правила:

- сообщения чата обычно append-only;
- voice notes append-only;
- task status требует conflict resolution;
- warehouse state требует controlled merge;
- access revocation должна применяться при первой возможности;
- опасные действия не должны silently overwrite server truth.

## Voice technology direction

Точную реализацию выбирать позже, но архитектура должна поддержать несколько вариантов.

Возможные направления:

- WebRTC внутри локальной сети;
- local SFU/relay на mini PC;
- lightweight voice server;
- push-to-talk over local WebSocket/WebRTC;
- voice notes as audio files with local upload queue;
- SIP/VoIP integration later;
- fallback to text when voice unavailable.

OpenWRT-only железо может быть слабым для полноценного voice server, поэтому предпочтительная архитектура:

```text
router provides LAN/Wi-Fi
mini PC / notebook / TV box runs field server and voice relay
```

Но лёгкие сценарии discovery/text/status могут работать и на роутере, если железо позволяет.

## PWA behavior on site

PWA должна уметь:

- открыть project field mode по local URL;
- работать по локальной сети;
- показывать offline/field status;
- отличать main company installation от field session;
- не смешивать cache разных company/project/fieldSession;
- сохранять локальную очередь;
- синхронизироваться при появлении интернета.

Кэш должен быть scoped by:

```text
companyId
installationId
projectId
fieldSessionId
userId/deviceId
baseUrl
```

## Security

Field mode повышает риски, потому что площадочная Wi-Fi сеть может быть доступна лишним людям.

Нужно:

- WPA2/WPA3 password;
- temporary access tokens;
- QR access with expiry;
- role-based room access;
- guest isolation if needed;
- no full company database on field server;
- encrypted transport where possible;
- local admin panel protected;
- audit of field session start/stop;
- ability to revoke field session;
- cleanup local data after project.

## Data retention

После завершения проекта field server должен:

- синхронизировать все события;
- подтвердить sync completion;
- сформировать field session report;
- удалить или архивировать локальные sensitive данные по политике компании;
- оставить только разрешённый технический лог.

## UI rules

Обычные пользователи должны видеть не “серверные кишки”, а простые статусы:

```text
Полевой режим активен
Вы подключены к локальной сети проекта
Интернет недоступен, события сохраняются локально
12 событий ожидают синхронизации
Голосовая связь: доступна / недоступна
```

Dev/admin может видеть:

- fieldSessionId;
- local queue;
- sync diagnostics;
- voice relay status;
- connected devices;
- local server health;
- logs.

## Relation to dev/admin diagnostics

Field diagnostics are admin/dev only.

Обычный пользователь не должен видеть:

- raw sync queue;
- raw WebRTC/voice diagnostics;
- server logs;
- tokens;
- local DB internals;
- network debug.

## MVP / Later

### MVP field mode

- local project access via QR;
- project task list offline;
- project text chat offline/LAN;
- local event queue;
- photo/checklist queue;
- sync when internet returns;
- basic local status page.

### Voice MVP

- push-to-talk or voice notes;
- role-based voice rooms;
- local-only operation;
- fallback to text;
- clear status when voice unavailable.

### Later

- full WebRTC voice rooms;
- local SFU/relay;
- emergency broadcast;
- SIP/VoIP bridge;
- radio/PA integration;
- rugged field server image;
- OpenWRT helper package;
- one-click field kit setup.

## Hardware profiles

### Minimal

```text
OpenWRT router
phones with PWA
text/status only or very light relay
```

### Recommended

```text
Router/OpenWRT
Mini PC / notebook / TV box
Pack.it field server
local voice relay
phones/tablets/laptops
```

### Advanced

```text
Router/OpenWRT
Mini PC/NUC
local storage
UPS/powerbank
external Wi-Fi AP
optional SIP/PA/radio bridge
```

## Итоговый закон

Pack.it должен предусматривать field communication mode для площадок без интернета: локальная сеть, временный field server, проектные чаты, голосовой/voiceover режим, локальная очередь событий и последующая синхронизация с основной company installation. Field mode может уменьшить потребность в отдельных рациях и простых интеркомах, особенно на небольших и средних проектах, но для safety-critical сценариев должен оставаться fallback на утверждённые средства связи. Field mode не должен копировать всю базу компании, не должен смешивать данные разных проектов, должен работать по ролям и доступам, а вся техническая диагностика field server/voice/sync должна быть доступна только dev/admin пользователям.
