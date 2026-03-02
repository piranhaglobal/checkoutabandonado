# Checkout Abandonado

Sistema de recuperação de checkout abandonado com disparos de WhatsApp em dois momentos: urgência (1 dia) e desconto (5 dias).

## Como funciona
- Jobs horários em dias úteis (09h–18h) verificam leads elegíveis.
- Urgência: 1 dia após abandono.
- Desconto: 5 dias após abandono.
- Deduplicação por template em janela configurável.

## Variáveis de Ambiente
Configure o arquivo `.env` com os valores reais e use `.env.example` como base.

## Jobs
- Urgência: POST `/admin/jobs/run-urgency`
- Desconto: POST `/admin/jobs/run-discount`

## Templates
Os templates ficam em `src/templates` e suportam placeholders:
- `{{first_name}}`
- `{{product_name}}`
- `{{checkout_url}}`
- `{{discount_code}}`

## Logs
Envios são registrados no SQLite em `data/checkouts.sqlite`.
