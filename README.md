# Orbit Web

Standalone Next.js frontend for the Orbit multi-tenant project management platform.

## Prerequisites

- **Node.js** 20+ (22 recommended)
- **npm** 9+
- Running **Orbit API** (see [orbit-api](../orbit-api) or your deployed API URL)

## Environment variables

Copy `.env.example` to `.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Base URL of the Orbit API (REST + Socket.io), e.g. `http://localhost:4000` |

All HTTP requests and Socket.io connections use `NEXT_PUBLIC_API_URL` via `src/lib/api-url.ts`.

**Important:** `NEXT_PUBLIC_*` variables are embedded at **build time**. Set them before `npm run build`.

## Development

```bash
npm install
cp .env.example .env
# Ensure NEXT_PUBLIC_API_URL points to your API

npm run dev
```

Open **http://localhost:3000**.

Start the API first so login, CSRF, and WebSockets work:

```bash
cd ../orbit-api
npm run dev
```

Ensure `FRONTEND_URL` in the API `.env` matches this app (default `http://localhost:3000`).

## Production

```bash
npm install
cp .env.example .env
# Set NEXT_PUBLIC_API_URL to your production API URL

npm run build
npm start
```

Default port: **3000** (override with `PORT`).

Deploy to Vercel, Docker, or any Node host. Set `NEXT_PUBLIC_API_URL` in your hosting provider's environment settings before building.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run lint` | ESLint |

## Features

- Dashboard analytics (Recharts)
- Projects & kanban tasks
- Calendar view
- Team & organization settings
- Real-time notifications and task updates (Socket.io)
- Platform admin panel (when granted)
