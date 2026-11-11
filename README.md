# Mini Project Manager

A small full-stack project-management app: sign up, create projects, and manage tasks inside them.

**Stack:** Next.js 14 (App Router) · React 18 · Redux Toolkit · Next.js Route Handlers (REST API) · MongoDB + Mongoose · JWT (`jose`) · TypeScript · Zod

## Features

The UI follows Jira's workflow: left sidebar, top bar with a global **Create** button, issue keys, board and list views.

- **Auth** – signup / login with email + password, JWT in an httpOnly cookie (an `Authorization: Bearer <token>` header is also accepted). Protected pages (Next.js middleware) and protected API routes (401 JSON). See *Password security* below.
- **Projects** – each user manages their own projects (`title`, `description`, plus an auto-generated or custom project **key** such as `WEB`). Create, edit, delete (also deletes its tasks).
- **Tasks** – belong to a project: `title`, `description`, `status` (`todo` | `in-progress` | `done`), `dueDate`. Each gets a Jira-style key (`WEB-1`, `WEB-2`, …).
  - **Board** view with drag & drop between status columns, inline *Create* at the bottom of each column.
  - **List** view (sortable table) with inline status change.
  - **Issue detail** dialog: click the summary/description to edit, change status and due date, delete.
  - **Filter by status** and **sort by due date / status / created** (asc or desc); search within a project.
  - Overdue tasks are highlighted. Light and dark themes follow the OS setting.

- **Dashboard** (`/dashboard`) – greeting, KPI tiles (projects, open, completed, overdue), a 14-day created-vs-completed chart, task-status donut, per-project progress bars, upcoming deadlines and recently updated tasks. Charts are hand-written SVG with hover/keyboard tooltips and a *Table* toggle for every chart; colours are validated for colour-blind separation in light and dark mode. The project list lives at `/projects`.
- **Login / signup** – split-screen with a product preview.

## Password security

- Signup rules (enforced on the server, mirrored live in the form): at least 8 characters, at least one letter and one number, at most 72 bytes (bcrypt's limit), and not on a short list of very common passwords. A strength meter, a show/hide toggle and a confirm-password field are shown on signup.
- Passwords are hashed with **bcrypt (cost 12)**, are salted, are never returned by the API (`select: false`) and never logged.
- Login returns the same `Invalid email or password` message for unknown emails and wrong passwords and always performs one bcrypt comparison, so neither the message nor the response time reveals which emails are registered.
- **Brute-force protection:** 5 failed logins per IP + email lock that pair out for 15 minutes (HTTP 429). The limiter is in-memory per server instance; on serverless / multi-instance hosting back it with a shared store such as Redis.
- Accounts created before these rules (e.g. with shorter passwords) can still log in; the rules apply to new passwords.

## Setup

Requirements: Node.js 18.18+ and a MongoDB instance (Atlas or local).

```bash
# 1. install
npm install

# 2. configure environment
cp .env.example .env.local      # then edit the values

# 3. run
npm run dev                     # http://localhost:3000
```

Using a local MongoDB instead of Atlas? Run `docker compose up -d` and set
`MONGODB_URI=mongodb://127.0.0.1:27017/mini-project-manager`.

Production: `npm run build && npm start`.

There is a single Next.js app — the frontend and the backend (API routes under `src/app/api`) run together, so there is nothing separate to start for the backend.

### Environment variables (`.env.example`)

| Variable      | Description                                                    |
| ------------- | -------------------------------------------------------------- |
| `MONGODB_URI` | MongoDB connection string (local or Atlas)                     |
| `JWT_SECRET`  | Long random string used to sign tokens (`openssl rand -hex 32`) |

## MongoDB Atlas setup

1. **Create an account** at <https://www.mongodb.com/cloud/atlas/register> and sign in (a new project/organization is created for you).
2. **Create a free cluster:** *Create* → choose the free **M0** tier → pick a cloud provider and the region closest to you → *Create Deployment*.
3. **Create a database user:** *Database Access* → *Add New Database User* → authentication method *Password* → enter a username and a strong password → give it the **Read and write to any database** role → *Add User*. Avoid `@ : / ? # %` in the password, or URL-encode them (e.g. `@` → `%40`).
4. **Configure network access:** *Network Access* → *Add IP Address* → *Add Current IP Address* (recommended). For quick testing or deploying to Vercel you can allow `0.0.0.0/0` (anywhere) — only do this with a strong password.
5. **Get the connection string:** *Database* → your cluster → *Connect* → *Drivers* → copy the `mongodb+srv://…` string.
6. **Configure `.env.local`** (this file is git-ignored — never commit it):

   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>.mongodb.net/mini-project-manager?retryWrites=true&w=majority
   JWT_SECRET=<long random string>
   ```

   Replace `<username>` / `<password>` / `<cluster-host>` with your values. The `mini-project-manager` database and its collections are created automatically on the first signup.
7. **Start the app:** `npm run dev` and open <http://localhost:3000>. Sign up — the new user appears in Atlas under *Browse Collections*.

If the app shows "Database is unavailable", check the terminal for the `[db] MongoDB connection failed` reason (wrong password, IP not allowed in Network Access, or a malformed URI). When deploying (e.g. Vercel), set the same `MONGODB_URI` and `JWT_SECRET` as environment variables in the host's dashboard.

### Connection handling

`src/lib/db.ts` caches the Mongoose connection on `globalThis`, so hot reloads and concurrent requests share a single connection. Failed attempts are not cached (the next request retries), time out after 8 s, and surface as a `503` with a generic message — the connection string/credentials are never logged or returned. Every API route goes through the `route()` wrapper, which connects before running any query. Credentials are only read server-side from `process.env`; there are no `NEXT_PUBLIC_` variables.

## Tests

```bash
npm test      # Vitest, runs against an in-memory MongoDB (no Atlas needed)
npm run lint  # TypeScript check
```

The suite (25 tests) covers signup/login, the password policy and hashing, login lockout and anti-enumeration, project keys and issue numbering, project and task CRUD, filtering/sorting, per-user data isolation, cascade delete, connection caching and graceful failure when the database is unreachable or unconfigured. (The first run downloads a MongoDB binary.)

## REST API

All routes except signup/login require a valid JWT (cookie or Bearer header).

| Method | Route                          | Description                                                         |
| ------ | ------------------------------ | ------------------------------------------------------------------- |
| POST   | `/api/auth/signup`             | `{name, email, password}` → creates user, sets cookie (password rules above) |
| POST   | `/api/auth/login`              | `{email, password}` → sets cookie                                   |
| POST   | `/api/auth/logout`             | clears cookie                                                       |
| GET    | `/api/auth/me`                 | current user                                                        |
| GET    | `/api/dashboard?today=YYYY-MM-DD&tz=<offset>` | aggregated dashboard data (totals, per-project, upcoming, recent, 14-day activity) |
| GET    | `/api/projects`                | list my projects (with task counts)                                 |
| POST   | `/api/projects`                | `{title, description, key?}` (key auto-generated if omitted)        |
| GET/PUT/DELETE | `/api/projects/:id`    | read / update / delete (cascades to tasks)                          |
| GET    | `/api/projects/:id/tasks`      | query: `status`, `sortBy` (`createdAt`\|`dueDate`\|`status`), `order` (`asc`\|`desc`) |
| POST   | `/api/projects/:id/tasks`      | `{title, description?, status?, dueDate?}`                          |
| GET/PUT/DELETE | `/api/tasks/:id`       | read / update (partial) / delete                                    |

Errors are returned as `{ "error": "message" }` with an appropriate status (400 validation, 401 unauthenticated, 404 not found / not yours, 409 duplicate email).

## Implementation notes

- **Authorization:** every project/task query is scoped to the authenticated user's id; accessing another user's resource returns 404 (no information leak).
- **Validation:** Zod schemas in `src/lib/validators.ts` are used on every write endpoint.
- **Route protection:** `src/middleware.ts` verifies the JWT on page requests and redirects to `/login?next=…`; logged-in users are redirected away from `/login` and `/signup`. API routes verify the token independently via the `route()` wrapper in `src/lib/api.ts`.
- **State:** Redux Toolkit slices (`auth`, `projects`, `tasks`) with async thunks; filter/sort state lives in the `tasks` slice and is applied **server-side**. Tasks without a due date always sort last.
- **Dates:** `dueDate` is a calendar date, stored as UTC midnight and displayed in UTC to avoid off-by-one-day shifts.

## Project structure

```
src/
  app/            pages (login, signup, dashboard, projects/[id]) and api/ route handlers
  components/     Navbar, Modal, AuthForm, ProjectForm, TaskForm, Providers
  lib/            db connection, JWT helpers, API wrapper, zod validators, fetch client
  models/         Mongoose models (User, Project, Task)
  store/          Redux Toolkit store and slices
  middleware.ts   page route protection
```
