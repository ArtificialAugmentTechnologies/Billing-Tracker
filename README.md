# A² Technologies Billing Tracker

Client, project and invoice management for Artificial Augment Technologies, with branded PDF invoices.

## Layout

| Folder    | Contents                                          |
| --------- | ------------------------------------------------- |
| `client/` | React 18, Vite, TypeScript and Tailwind front end |
| `server/` | Express and TypeScript API                        |
| `shared/` | Code used by both the client and the server       |

## Run it locally

Requires Node.js 22.9 or newer.

1. Copy `server/.env.example` to `server/.env` and fill in the Neon URLs, `JWT_SECRET` and `SEED_ADMIN_PASSWORD`.
2. Install, set up the database and start the app:

```sh
npm install
npm run db:generate -w server
npm run db:deploy -w server
npm run db:seed -w server
npm run dev
```

- App: http://localhost:5173
- API health check: http://localhost:4000/api/health

Sign in as `admin@artificialaugmenttechnologies.com` with the `SEED_ADMIN_PASSWORD` value. Re-running the seed is safe: it never changes existing rows, so an existing admin keeps their password.

After 10 failed sign-ins from one address, sign-in is blocked for 15 minutes. Restarting the server clears the block.

## Other commands

| Command             | Purpose                       |
| ------------------- | ----------------------------- |
| `npm run typecheck` | Type-check every workspace    |
| `npm run lint`      | Run ESLint                    |
| `npm run format`    | Format the code with Prettier |
| `npm run build`     | Build the client              |

Create a database migration during development with `npm run db:migrate -w server`, and apply migrations in production with `npm run db:deploy -w server`.
