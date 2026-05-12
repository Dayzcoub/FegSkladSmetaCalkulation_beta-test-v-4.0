# FEG Stage PRO — проверка сборок без настоящего админа

Эта памятка нужна для локальной проверки v4-preview без Supabase, реального invite key и настоящего admin-аккаунта.

## Быстрая проверка

```bash
npm run check
npm run dev
```

Затем открой приложение локально и используй блок **DEMO AUTH** на приветственном экране v4.

## Demo-роли

Доступны роли:

- admin;
- manager;
- technician;
- warehouse;
- viewer.

## Что проверять

- technician видит быстрые калькуляторы и не видит цены;
- manager видит мастер сметы, проекты, клиентов и цены;
- warehouse видит складские сценарии;
- viewer работает как режим просмотра;
- admin видит все разделы.

## Важное правило безопасности

Demo Auth нельзя жёстко включать в production через inline-флаг в `index.html`. Smoke-check проверяет, что строка `FEG_ENABLE_DEMO_AUTH = true` не зашита в HTML.

Для production demo-вход должен быть выключен через конфигурацию приложения.
