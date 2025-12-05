# MeterFlow

Простое клиент-серверное приложение для учёта показаний коммунальных счётчиков с аналитикой и прогнозом начислений.

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
   python manage.py runserver 0.0.0.0:7001
   ```
   По умолчанию используется SQLite. Для PostgreSQL задайте переменные окружения:
   ```bash
   export DB_ENGINE=postgres
   export POSTGRES_DB=energo_db
   export POSTGRES_USER=energo_user
   export POSTGRES_PASSWORD=energo_pass
   export POSTGRES_HOST=localhost
   export POSTGRES_PORT=7002
   ```
2. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev -- --host --port 7000
   ```
   По умолчанию фронтенд ожидает API по адресу `http://localhost:7001/api/`. При необходимости задайте `VITE_API_URL`.

## Запуск через Docker Compose
```bash
docker-compose up --build
```
- Backend: http://localhost:7001
- Frontend: http://localhost:7000
- PostgreSQL: порт 7002 на хосте (и внутри контейнера), учётные данные в `docker-compose.yml` или `backend/.env.example`.

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
