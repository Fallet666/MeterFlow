# MeterFlow

Простое клиент-серверное приложение для учёта показаний коммунальных счётчиков с аналитикой и прогнозом начислений.

## Архитектура
- **Backend:** Django + Django REST Framework, JWT-аутентификация через `djangorestframework-simplejwt`.
- **Database:** PostgreSQL (по умолчанию SQLite для локальной разработки).
- **Frontend:** React + Vite, маршрутизация на React Router 7, графики на Recharts.
- **Инфраструктура:** Docker Compose поднимает API, PostgreSQL и SPA.

## Функциональность
- Регистрация и вход через JWT.
- Управление объектами недвижимости и счётчиками.
- Ввод показаний с автоматическим расчётом помесячных начислений по тарифам.
- Учёт тарифов, платежей, просмотр начислений и аналитики.
- Прогноз суммы начислений за текущий месяц.

## Быстрый запуск без Docker
1. **Backend**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver 0.0.0.0:8000
   ```
   По умолчанию используется SQLite. Для PostgreSQL задайте переменные окружения:
   ```bash
   export DB_ENGINE=postgres
   export POSTGRES_DB=meterflow
   export POSTGRES_USER=meterflow
   export POSTGRES_PASSWORD=meterflow
   export POSTGRES_HOST=localhost
   export POSTGRES_PORT=5432
   ```
2. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev -- --host --port 5173
   ```
   По умолчанию фронтенд ожидает API по адресу `http://localhost:8000/api/`. При необходимости задайте `VITE_API_URL`.

## Запуск через Docker Compose
```bash
docker-compose up --build
```
- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- PostgreSQL: порт 5432, учётные данные в `docker-compose.yml` или `backend/.env.example`.

### Прогон тестов через Docker Compose
- Все сервисы + тестовые контейнеры:
  ```bash
  docker compose --profile test up --build --abort-on-container-exit
  ```
- Только фронтенд-тесты без поднятия приложения:
  ```bash
  docker compose --profile test run --rm frontend-tests
  ```
- Только бэкенд-тесты (использует PostgreSQL из docker-compose):
  ```bash
  docker compose --profile test run --rm backend-tests
  ```
Профиль `test` добавляет отдельные контейнеры для прогонки тестов и не влияет на обычный деплой через `docker-compose up`.

## Основные эндпоинты
- `POST /api/auth/register/` — регистрация пользователя с мгновенной выдачей токенов.
- `POST /api/auth/login/` — получение JWT.
- CRUD: `/api/properties/`, `/api/meters/`, `/api/readings/`, `/api/tariffs/`, `/api/payments/`.
- `GET /api/monthly-charges/` — начисления (read-only).
- `GET /api/analytics/` — агрегированные данные для графиков.
- `GET /api/analytics/forecast/` — прогноз суммы за текущий месяц.

## Бизнес-логика
- При создании показания рассчитывается дельта по предыдущему чтению, подбирается актуальный тариф и обновляется соответствующая запись `MonthlyCharge`.
- Прогноз вычисляется как среднее начислений за последние несколько полных месяцев.

## UI-страницы
- Авторизация/регистрация.
- Дашборд с выбором объекта, прогнозом и последними показаниями.
- Объекты, счётчики, показания.
- Аналитика с графиками начислений и потребления (Recharts).

## Тестирование
- **Backend (pytest + pytest-django):** покрыты модели, сериализаторы, ключевые API и аналитика. Перед запуском убедитесь, что зависимости установлены и применены миграции. Команда: `cd backend && pytest`.
- **Frontend (Vitest + Testing Library):** компонентные тесты страниц авторизации, дашборда, показаний и аналитики с моками API. Команда: `cd frontend && npm test`.
- Для PostgreSQL задайте переменные окружения `DB_ENGINE=postgres` и параметры подключения перед запуском тестов, либо оставьте SQLite по умолчанию.
- Фронтенду нужен `npm install` и актуальное значение `VITE_API_URL`, если API работает не на `http://localhost:8000/api/`.

## Типовой сценарий для нового разработчика
1. Установите зависимости:
   ```bash
   cd backend && python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   cd ../frontend && npm install
   ```
2. Подготовьте базу и переменные окружения (при необходимости PostgreSQL с `DB_ENGINE=postgres`). Выполните миграции:
   ```bash
   cd backend
   source .venv/bin/activate
   python manage.py migrate
   ```
3. Запустите сервисы локально:
   ```bash
   # Backend
   cd backend && source .venv/bin/activate && python manage.py runserver 0.0.0.0:8000
   # Frontend (в другом терминале)
   cd frontend && npm run dev -- --host --port 5173
   ```
4. Прогоните тесты:
   ```bash
   cd backend && pytest
   cd ../frontend && npm test
   ```
5. Для проверки всего стека через контейнеры используйте `docker-compose up --build` — это поднимет API, базу и SPA.

## Тесты и тест-кейсы

### Автоматические проверки
- **Backend (`pytest`)** — добавлены сервисные тесты `core/tests/test_services.py`, которые:
  - убеждаются, что `process_reading` игнорирует отрицательную дельту показаний и не создает начисление при откате счётчика;
  - проверяют, что `forecast_property` считает прогноз как среднее значение последних N месяцев и исключает текущий месяц из выборки.
- **Frontend (`vitest`)** — новый файл `src/__tests__/PropertiesPage.test.tsx` покрывает управление объектами:
  - загрузку объектов при монтировании страницы и добавление нового объекта через форму;
  - обязательное подтверждение паролем перед удалением и корректную обработку ошибок аутентификации.

### Ручные тест-кейсы
1. **Регистрация + демо-данные**  
   - Зарегистрировать пользователя `test`.  
   - Убедиться, что после входа автоматически созданы объект недвижимости, тарифы и история показаний (дашборд заполняется данными).
2. **Управление объектами**  
   - Создать новый объект на странице «Объекты».  
   - Выбрать его активным, после чего открыть удаление и подтвердить корректным паролем — объект исчезает из списка, активным становится следующий.
3. **Ввод показаний**  
   - Создать два последовательных показания по счётчику.  
   - Проверить, что начисления обновились на вкладке «Начисления» и прогноз на дашборде пересчитался.  
   - Попробовать внести показание меньше предыдущего — должно появиться предупреждение, а начисления не меняются.
4. **Аналитика и платежи**  
   - Добавить несколько платежей и перейти в «Аналитику».  
   - Проверить отображение суммарных значений, графиков и блока прогнозов.  
   - Отфильтровать данные по конкретному объекту или ресурсу и убедиться, что диаграммы подстраиваются под фильтр.
