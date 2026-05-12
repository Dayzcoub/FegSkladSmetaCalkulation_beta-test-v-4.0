# Client ↔ Project links

Версия: v3.8.36

Этот слой связывает локальную CRM-карточку клиента с сохранёнными проектами/сметами.

## Что связываем

- `client.id` ↔ `quote.client.id`;
- fallback по `email`, `phone`, `name`;
- project record хранит `clientId`, `clientEmail`, `clientPhone`, `clientName`.

## Зачем

- из клиента видеть связанные проекты;
- из проекта видеть CRM-карточку клиента;
- готовить будущую серверную связку `clients` ↔ `quotes` в Supabase.

## Безопасность слоя

Расчёты, цены, склад, LED, фермы и старый v3-интерфейс не меняются.
