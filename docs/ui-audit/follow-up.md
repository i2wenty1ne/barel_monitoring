# UI Audit Follow-up

Дата повторной проверки: 24.06.2026

## Что изменено

- Мониторинг стал плотнее: карточка бочки видна в первом viewport 1180x760, summary-панели собраны в одну строку на рабочей ширине.
- Убраны demo-unfriendly тексты `Foundation stage`, mock-service description и TODO fullscreen.
- Top status bar русифицирован: `Последний OK`, `Предупреждения`, `Аварии`; нулевые warning/alarm приглушены.
- Настройки получили URL-state вкладок: `#/settings?tab=channels`, `#/settings?tab=service` и fallback на `connection`.
- Save-панель сделана компактной и sticky.
- Каналы переведены на collapsible-карточки с summary, группами полей, подсказками, scaling preview и защитой удаления используемого канала.
- Бочки получили inline warning для отсутствующих каналов и confirm/danger zone для удаления.
- Пороги получили визуальную шкалу и inline validation порядка значений.
- Сервисный сброс вынесен в danger zone.
- Диагностика уплотнена, устаревший текст про нереализованный real Modbus заменён.
- Таблицы диагностики и журнала получили compact/max-height режим и русские заголовки.
- Детали бочки русифицированы, технические параметры вынесены в collapsible-блок.
- About показывает режим сборки `development`/`production`.
- Fullscreen on start реализован в Electron main window startup.

## Проверка

- `npm run typecheck` — успешно.
- `npm run build` — успешно.
- `npm run dev -- --remote-debugging-port=9222` — приложение запущено, скриншоты пересняты.
- CDP runtime: exceptions `0`.
- Console: только dev-сообщения Vite/React DevTools и Electron CSP warning, ожидаемые для dev-mode.

## Обновлённые артефакты

- Скриншоты: `docs/ui-audit/screenshots/*.png`
- Runtime notes: `docs/ui-audit/runtime-notes-after.json`

## Остаточные замечания

- В журнале события `Application started` остаются на английском, потому что это message из event log data, не только UI label.
- В диагностике некоторые инженерные значения (`Data bits`, `Parity`, raw JSON scaling) оставлены техническими терминами намеренно.
- Electron CSP warning сохраняется только в dev-mode; packaged build не должен показывать это предупреждение.
