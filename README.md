# A² Technologies Billing Tracker

Client, project, invoice and payment management for Artificial Augment Technologies, with branded PDF invoices and receipts.

## What's in the repository

| Folder    | Contents                                                                 |
| --------- | ------------------------------------------------------------------------ |
| `client/` | React 18, Vite, TypeScript and Tailwind front end                        |
| `server/` | Express and TypeScript API, Prisma schema and migrations, PDF generation |
| `shared/` | Code used by both: totals, numbering, validation and the PDF templates   |

## Run it locally

Requires Node.js 22.9 or newer and a PostgreSQL database. The project uses [Neon](https://neon.tech).

1. Copy `server/.env.example` to `server/.env` and fill in the values:

   | Setting               | Value                                                |
   | --------------------- | ---------------------------------------------------- |
   | `DATABASE_URL`        | Neon **pooled** connection (host contains `-pooler`) |
   | `DIRECT_URL`          | Neon **direct** connection, used for migrations      |
   | `JWT_SECRET`          | A long random string, at least 32 characters         |
   | `SEED_ADMIN_PASSWORD` | Password for the admin account created by the seed   |

2. Install everything and set up the database:

   ```sh
   npm install
   npx puppeteer browsers install chrome
   npm run db:generate -w server
   npm run db:deploy -w server
   npm run db:seed -w server
   ```

3. Start the app:

   ```sh
   npm run dev
   ```

   - App: http://localhost:5173
   - API health check: http://localhost:4000/api/health

Sign in as `admin@artificialaugmenttechnologies.com` with the `SEED_ADMIN_PASSWORD` value, then change it under **Settings → My password**. Re-running the seed is safe: it never changes existing rows.

## First steps after signing in

Under **Settings**, replace the placeholders before issuing real invoices:

- **Company:** company details, bank details, signature image and default terms.
- **Catalogue:** the services offered, with their usual rates.
- **Users:** one account for each person, as Admin or Staff.

The sample client, project and invoice come from the seed. Their address and contact details are placeholders.

## How it works

- **Drafts** hold a temporary label such as `DRAFT-42B98127`, so a deleted draft never leaves a gap in the invoice numbers.
- **Finalize** assigns the real number (`AAT/INV/2026-27/001`, restarting each April), locks the invoice and stores its PDF.
- **Finalized invoices** can't be edited. An admin can create a revision, which cancels the original once it's finalized, or cancel an invoice that has no payments.
- **Status** follows payments and due dates: Sent, Partially paid, Paid or Overdue. Overdue is applied the next time the data is read.
- **Totals** are always recalculated on the server, using the same code as the on-screen preview.

### Roles

| Action                                                          | Staff | Admin |
| --------------------------------------------------------------- | ----- | ----- |
| Manage clients, projects and milestones                         | Yes   | Yes   |
| Create and finalize invoices, record payments, download reports | Yes   | Yes   |
| Change their own password                                       | Yes   | Yes   |
| Create revisions, cancel invoices and delete payments           | No    | Yes   |
| Change company settings, the catalogue and users                | No    | Yes   |

## Deploying to production

The server delivers the built front end itself, so the whole app runs as one process.

```sh
npm install
npx puppeteer browsers install chrome
npm run db:deploy -w server
npm run build
NODE_ENV=production npm start
```

Set these as real environment variables on the host, or keep them in `server/.env`:

- `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` and `PORT`.
- `CLIENT_ORIGIN`, set to the site's public address, such as `https://billing.example.com`.

Things to know:

- **HTTPS is required.** In production the session cookie is only sent over HTTPS, so sign-in won't work on a plain `http://` address other than `localhost`.
- **One proxy is assumed.** The app trusts one reverse proxy in front of it for visitors' addresses. Change `trust proxy` in `server/src/app.ts` if your host differs.
- **Keep `server/storage/` on permanent disk.** It holds the PDFs of issued invoices. If a file is lost, it's rebuilt on the next download using the current company settings, so back this folder up.
- **Internet access is needed for PDFs.** They load their fonts from Google Fonts. Without it, PDFs still generate but use fallback fonts.
- **Chrome needs system libraries on Linux.** Puppeteer's documentation lists them for each distribution.

## Commands

| Command                        | Purpose                               |
| ------------------------------ | ------------------------------------- |
| `npm run dev`                  | Run the app with live reload          |
| `npm test`                     | Run the unit tests                    |
| `npm run typecheck`            | Type-check every workspace            |
| `npm run lint`                 | Run ESLint                            |
| `npm run format`               | Format the code with Prettier         |
| `npm run build`                | Build the front end                   |
| `npm start`                    | Start the server                      |
| `npm run db:migrate -w server` | Create a migration during development |
| `npm run db:deploy -w server`  | Apply migrations                      |
| `npm run db:seed -w server`    | Add the starting data                 |

## Troubleshooting

| Problem                                | What to do                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| The page won't load                    | Check that `npm run dev` is running, from the `BillingTracker` folder                                       |
| Sign-in says too many attempts         | Wait 15 minutes, or restart the server                                                                      |
| A page fails after installing packages | Stop the servers, delete `node_modules/.vite` and `client/node_modules/.vite`, then run `npm run dev` again |
| PDFs fail with a browser error         | Run `npx puppeteer browsers install chrome`                                                                 |
| A Prisma command fails on Windows      | Stop the dev servers first, because the running app locks Prisma's files                                    |
| Port 5173 is already in use            | Another copy of the app is running. Close it, because the app won't move to a different port                |
