# SportHub — онлайн-сервіс бронювання спортивних залів і секцій

[![CI](https://github.com/yuriivynar/sports-booking-service/actions/workflows/ci.yml/badge.svg)](https://github.com/yuriivynar/sports-booking-service/actions/workflows/ci.yml)

Вебзастосунок, що імітує роботу мережі спортивних центрів. Користувачі переглядають зали, секції та тренерів, бронюють заняття, оплачують послуги, отримують бонуси й сповіщення. Адміністратори керують каталогом, розкладом і налаштуваннями.

Курсова робота з дисципліни «Документування програмного забезпечення та шаблони проектування» (варіант 1).

> **Статус:** у розробці. Розділ «Функціональність» описує обсяг проєкту.

## Функціональність

- **Каталог:** спортивні центри на карті, зали, секції (футбол, йога, фітнес, плавання тощо), тренери. Фільтри за видом спорту, рівнем підготовки та віковою категорією.
- **Бронювання:** оренда залу на часовий слот, місце в груповому занятті, персональне заняття з тренером. Підтвердження та скасування бронювання, захист від подвійного бронювання.
- **Оплата:** імітація платіжного шлюзу.
- **Особистий кабінет:** історія бронювань, профіль (контакти, фото, вподобання), абонементи (разові, місячні, корпоративні).
- **Лояльність:** картки Standard, Premium і Corporate; бонусні бали за бронювання; персональні пропозиції.
- **Сповіщення:** нагадування про тренування, нові секції та акції, нарахування бонусів (у застосунку та email).
- **Адмін-частина:** керування центрами, залами, секціями, тренерами, розкладом, акціями й тарифами; статистика.

## Технології

| Частина                 | Технології                                                   |
| ----------------------- | ------------------------------------------------------------ |
| Бекенд                  | NestJS 12, TypeScript, REST, Swagger                         |
| Фронтенд                | Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui |
| Дані                    | PostgreSQL, Prisma ORM                                       |
| Автентифікація та файли | Supabase Auth (email і Google), Supabase Storage             |
| Тести                   | Vitest, Testing Library, Supertest                           |
| Інфраструктура          | pnpm workspaces, Docker Compose, GitHub Actions, Vercel      |

## Структура репозиторію

```
.
├─ apps/
│  ├─ api/                 # NestJS REST API
│  └─ web/                 # Next.js: клієнтська та адмін-частина
├─ docker/postgres/        # скрипт ініціалізації локальної БД
├─ docs/diagrams/          # UML-діаграми (PlantUML)
├─ .github/workflows/      # CI
└─ docker-compose.yml      # локальні Postgres і Mailpit
```

## Локальний запуск

### Вимоги

- Node.js 24 LTS (версія вказана в `.nvmrc`)
- pnpm 10 (вмикається через corepack з комплекту Node.js 24, окремо встановлювати не потрібно)
- Docker Desktop

### Кроки

1. Клонуйте репозиторій і встановіть залежності:

   ```bash
   git clone https://github.com/yuriivynar/sports-booking-service.git
   cd sports-booking-service
   corepack enable
   pnpm install
   ```

2. Запустіть локальні Postgres і Mailpit:

   ```bash
   docker compose up -d
   ```

   Postgres доступний на порту **5433**, щоб не конфліктувати з локально встановленим Postgres на стандартному порту 5432.

3. Створіть файли змінних середовища з прикладів і заповніть значення Supabase (як їх отримати, описано в коментарях усередині файлів):

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

   Щоб вхід працював локально, додайте `http://localhost:3000/**` у Supabase → Authentication → URL Configuration → Redirect URLs.

4. Створіть таблиці та заповніть базу демоданими (4 центри у Львові, зали, тренери, секції й розклад на 14 днів):

   ```bash
   pnpm --filter api db:deploy
   pnpm --filter api db:seed
   ```

5. Запустіть обидва застосунки:

   ```bash
   pnpm dev
   ```

| Сервіс                      | Адреса                           |
| --------------------------- | -------------------------------- |
| Сайт                        | http://localhost:3000            |
| API (перевірка стану)       | http://localhost:4000/api/health |
| Документація API (Swagger)  | http://localhost:4000/api/docs   |
| Mailpit (перехоплені листи) | http://localhost:8025            |

## Архітектура та патерни

API складається з модулів NestJS. Бронювання проходить через `BookingFacade`, який координує решту патернів:

| Патерн                  | Де в коді                                           | Навіщо                                                                 |
| ----------------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| Singleton               | `apps/api/src/prisma/prisma.service.ts`             | Один клієнт БД і пул з'єднань через DI                                 |
| Builder                 | `apps/api/src/catalog/catalog-query.builder.ts`     | Пошук секцій за фільтрами                                              |
| Factory Method          | `apps/api/src/bookings/creators/`                   | Свій творець і «чернетка» для кожного типу бронювання                  |
| Chain of Responsibility | `apps/api/src/bookings/validation/`                 | Перевірки: час, години роботи, місця, абонемент, зайнятість, дублікати |
| State                   | `apps/api/src/bookings/state/booking-state.ts`      | Дозволені переходи PENDING → CONFIRMED → COMPLETED / CANCELLED         |
| Decorator               | `apps/api/src/bookings/pricing/price-calculator.ts` | Ціна: абонемент, акція, картка, бали та розбивка для користувача       |
| Strategy                | `apps/api/src/loyalty/loyalty-policy.ts`            | Правила карток Standard, Premium, Corporate                            |
| Adapter                 | `apps/api/src/payments/`, `apps/api/src/storage/`   | Імітований банк і Supabase Storage за нашими інтерфейсами              |
| Facade                  | `apps/api/src/bookings/booking.facade.ts`           | Один вхід: перевірити → створити → оцінити → транзакція → оплатити     |
| Observer                | `apps/api/src/events/event-bus.ts`                  | Доменні події бронювань для сповіщень                                  |

Від подвійного бронювання захищає сама база: exclusion constraints на `occupancies` і умовний `UPDATE` лічильника місць.

Діаграми (PlantUML, `docs/diagrams/`):

- [Діаграма класів із патернами](docs/diagrams/class-diagram.png)
- [Послідовність бронювання та оплати](docs/diagrams/booking-sequence.png)
- [Стани бронювання](docs/diagrams/booking-state.png)
- [Варіанти використання](docs/diagrams/use-case.png) · [ER-діаграма](docs/diagrams/er-diagram.png)

## Дизайн

- **Дизайн-система** на токенах (кольори за ролями, шрифти, радіуси, тіні, анімації) у `apps/web/src/app/globals.css`; жива документація — сторінка `/design`.
- Світла й темна теми, шрифти Unbounded (заголовки) і Geist (текст), власний логотип.
- Доступність: контраст WCAG AA, видимий фокус, посилання «Перейти до вмісту», повага до «Зменшити рух».
- Анімації лише на `transform`/`opacity`; ефекти прокрутки — CSS scroll-driven animations; переходи між сторінками — React `<ViewTransition>`.
- Фото — [Unsplash](https://unsplash.com/license), авторів перелічено в `apps/api/prisma/seed-photos.ts`.

## Корисні команди

| Команда                                | Що робить                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `pnpm dev`                             | Запускає API і сайт у режимі розробки                                      |
| `pnpm build`                           | Збирає обидва застосунки                                                   |
| `pnpm lint`                            | Перевіряє код лінтерами (oxlint для API, ESLint для сайту)                 |
| `pnpm typecheck`                       | Перевіряє типи TypeScript                                                  |
| `pnpm test`                            | Запускає модульні тести                                                    |
| `pnpm --filter api test:e2e`           | Запускає e2e-тести API на окремій базі `sports_booking_test`               |
| `pnpm --filter api db:migrate`         | Створює та застосовує нову міграцію після зміни `schema.prisma`            |
| `pnpm --filter api db:deploy`          | Застосовує наявні міграції                                                 |
| `pnpm --filter api db:seed`            | Додає демодані; повторний запуск лише доповнює розклад                     |
| `pnpm --filter api db:seed:production` | Додає демодані в продакшн-базу (адреса з `apps/api/.env.production.local`) |
| `pnpm --filter api photos:upload`      | Копіює демофото з Unsplash у Supabase Storage (бакет `media`)              |
| `pnpm --filter api db:studio`          | Відкриває Prisma Studio для перегляду даних                                |
| `pnpm --filter web api:types`          | Оновлює TypeScript-типи API для сайту з OpenAPI (API має бути запущений)   |
| `pnpm format`                          | Форматує код за допомогою Prettier                                         |

## CI/CD

- **CI (GitHub Actions):** на кожен pull request і push у `main` виконуються перевірка форматування, лінтери, перевірка типів, модульні тести, e2e-тести API з PostgreSQL і збірка обох застосунків.
- **CD (Vercel):** після злиття в `main` Vercel автоматично розгортає обидва застосунки, а для кожного pull request створює окрему тестову копію.

## Розгортання на Vercel

Застосунки розгортаються як два окремі проєкти Vercel з одного репозиторію:

| Проєкт                       | Root Directory | Framework Preset                         | Продакшн                                      |
| ---------------------------- | -------------- | ---------------------------------------- | --------------------------------------------- |
| `sports-booking-service-api` | `apps/api`     | NestJS (задано в `apps/api/vercel.json`) | https://sports-booking-service-api.vercel.app |
| `sports-booking-service-web` | `apps/web`     | Next.js                                  | https://sports-booking-service-web.vercel.app |

1. На [vercel.com/new](https://vercel.com/new) імпортуйте репозиторій і створіть проєкт API з налаштуваннями з таблиці.
2. Додайте змінні середовища API (перелік і пояснення — у `apps/api/.env.example`). `WEB_ORIGIN` — адреса сайту, з якої дозволені запити. `ADMIN_EMAILS` — email-и адміністраторів через кому: ці користувачі отримують роль `ADMIN` під час входу.
3. Так само створіть проєкт сайту і додайте змінні з `apps/web/.env.example`. `NEXT_PUBLIC_API_URL` — адреса API з префіксом `/api`. Змінні з префіксом `NEXT_PUBLIC_` вбудовуються в код для браузера, тому їх додають як звичайні (не Sensitive).
4. Після цього кожне злиття в `main` розгортається автоматично.

API працює як Vercel Function: Vercel викликає обробник, експортований із `apps/api/src/serverless.ts`, а не сервер, що слухає порт. Функція розгортається в регіоні Dublin (`dub1`), поруч із базою даних Supabase (`eu-west-1`): кожен запит до API робить кілька звернень до бази, тож саме ця відстань найбільше впливає на швидкість.

Міграції бази даних застосовуються автоматично під час кожного продакшн-розгортання API (скрипт `vercel-build` у `apps/api/package.json`). Тестові копії для pull request-ів міграції не запускають, тож не змінюють продакшн-базу.

Версію Node.js для Vercel задає поле `engines.node` (`24.x`) у `package.json` кожного застосунку, а для CI — файл `.nvmrc`. Vercel і GitHub Actions самі беруть останній патч-випуск гілки 24, тож виправлення безпеки потрапляють у збірки автоматично.
