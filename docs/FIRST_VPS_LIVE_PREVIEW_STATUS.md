# First VPS live preview status

Этот документ фиксирует состояние первого live-preview Pack.it на VPS.

## Статус

Первый live-preview Pack.it поднят на VPS и открывается по публичному HTTP-порту.

```text
URL: http://45.148.118.121:8088/#app
```

Это не production-ready запуск и не финальная версия приложения.

Это контрольная точка:

- приложение развёрнуто на реальном VPS;
- текущий frontend запускается с сервера;
- Amnezia VPN на 443 не трогали;
- deploy/health/rollback контур подготовлен;
- GitHub Actions manual deploy настроен и успешно прошёл зелёным;
- GitHub Actions deploy-user trace проверен: SSH user `packit-deploy`, effective sudo user `root`;
- интерфейс работает ровно в том состоянии, в котором разработка была остановлена.

## Что было сделано на VPS

- добавлен 1 GB swap;
- создана структура `/opt/packit`;
- создан системный пользователь `packit`;
- создан deploy-пользователь `packit-deploy` для GitHub Actions;
- настроен SSH key access для `packit-deploy`;
- настроен limited sudo для deploy/health/rollback scripts;
- создана структура `company-main`:

```text
/opt/packit/apps/company-main
    /current
    /releases
    /shared
    /logs
    /backups
```

- репозиторий склонирован из GitHub `main`;
- `current` указывает на активный release;
- создан systemd-сервис `packit-company-main-preview.service`;
- сервис отдаёт статический frontend через Python HTTP server на порту `8088`;
- создан health-check script;
- создан deploy script from GitHub main;
- создан rollback script;
- deploy script now writes installation and release metadata into each release under `packit-installation/`.

## GitHub Actions deploy

Добавлен manual workflow:

```text
.github/workflows/deploy-vps-preview.yml
```

Workflow использует repository secrets:

```text
PACKIT_VPS_HOST
PACKIT_VPS_PORT
PACKIT_VPS_USER
PACKIT_VPS_SSH_KEY
```

Deploy flow:

```text
GitHub Actions
    ↓ SSH as packit-deploy
VPS
    ↓ sudo limited command
/opt/packit/scripts/deploy/deploy-company-main-from-github.sh main
    ↓
health-check
```

Первый запуск workflow прошёл зелёным.

Проверенный release metadata example:

```json
{
  "releaseId": "20260523_091606",
  "branch": "main",
  "deployedBySshUser": "packit-deploy",
  "deployedByEffectiveUser": "root",
  "service": "packit-company-main-preview.service"
}
```

## Installation identity

Первая VPS installation имеет идентичность:

```text
companyId: packit-first-company
companyCode: first-company
installationId: 5402e645-b4be-416e-943f-b9e7cfdf45b1
environment: first-company-production-like
publicUrl: http://45.148.118.121:8088/#app
```

Shared config lives on VPS:

```text
/opt/packit/apps/company-main/shared/config/company.json
/opt/packit/apps/company-main/shared/env/installation.env
```

Each release receives a read-only snapshot:

```text
/opt/packit/apps/company-main/current/packit-installation/company.json
/opt/packit/apps/company-main/current/packit-installation/release-info.json
```

## Что важно

Текущий интерфейс работает так же, как работал на момент остановки разработки, со всеми уже известными незавершёнными местами и UI/логическими косяками.

Эти косяки не являются результатом VPS-развёртывания. Они относятся к текущему состоянию приложения и должны исправляться отдельными задачами разработки.

## Что не делалось

- не настраивали полноценный backend;
- не подключали PostgreSQL;
- не делали company config activation inside frontend runtime;
- не закрывали публичный порт `8088`;
- не подключали домен;
- не настраивали HTTPS;
- не трогали Amnezia VPN на `443`;
- не делали production hardening;
- не чистили текущий frontend/UI;
- не исправляли существующие баги интерфейса.

## Security note

Порт `8088` сейчас публично доступен.

Это временный preview mode.

Позже нужно:

- закрыть `8088` наружу;
- оставить доступ через SSH tunnel, VPN или reverse proxy;
- либо перевести на нормальный домен/HTTPS;
- включить защиту/авторизацию перед реальным использованием.

## Текущий закон

Первый VPS live-preview считается успешным инфраструктурным шагом: Pack.it запускается на реальном сервере, есть release/current structure, health-check, deploy, rollback, installation identity, release metadata and GitHub Actions manual deploy. Качество интерфейса и логики соответствует текущему незавершённому состоянию приложения и должно улучшаться отдельными итерациями разработки после этой контрольной точки.
