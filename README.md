# status.maslahat.ai

Страница статуса сервисов Maslahat AI. Проверки идут раз в 5 минут (`.github/workflows/check.yml` → `checker.py`)
и пишут `status.json` / `history.json`; GitHub Pages отдаёт страницу.

Исходники страницы и проверки живут в основном репозитории Maslahat (папка `status/`) — правьте там и переносите сюда.
Инциденты — вручную в `incidents.json` (формат — в README основного репо).
