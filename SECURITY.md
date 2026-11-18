# Security Policy

## Zero Token Consumption and Security Statement

1. **Zero Token Consumption**: the plugin's probe uses lightweight HTTP `HEAD` / `GET` connection tests, measuring only network round-trip latency (RTT), never calling model inference interfaces such as `/chat/completions`, and consumes no token quota.
2. **Read-only local configuration**: the plugin backend parses `settings.yaml` in read-only mode only, writing nothing to any system configuration and not altering it.
3. **No leakage of sensitive data**: all probe data is supplied for consumption exclusively by the local DSH Web interface, not uploading telemetry to any third parties.

## Политика безопасности

### Нулевое потребление токенов и заявление о безопасности

1. **Нулевое потребление токенов**: зонд плагина использует лёгкие проверки соединения HTTP `HEAD` / `GET`, измеряя только сетевую задержку round-trip (RTT), никогда не вызывая интерфейсы вывода модели вроде `/chat/completions` и не расходуя квоту токенов.
2. **Локальная конфигурация только для чтения**: бэкенд плагина разбирает `settings.yaml` только в режиме чтения, не записывая и не изменяя никаких системных конфигураций и ключей.
3. **Без утечки чувствительных данных**: все данные зонда предназначены исключительно для потребления локальным DSH Web-интерфейсом, телеметрия на сторонние сервисы не передаётся.
