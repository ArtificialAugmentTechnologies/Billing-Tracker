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

```sh
npm install
npm run dev
```

- App: http://localhost:5173
- API health check: http://localhost:4000/api/health

## Other commands

| Command             | Purpose                       |
| ------------------- | ----------------------------- |
| `npm run typecheck` | Type-check every workspace    |
| `npm run lint`      | Run ESLint                    |
| `npm run format`    | Format the code with Prettier |
| `npm run build`     | Build the client              |
