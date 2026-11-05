import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env, isProduction } from './config/env';
import { errorHandler } from './lib/http';
import { requireAuth, requireRole } from './middleware/auth';
import { authRouter } from './routes/auth';
import { catalogRouter } from './routes/catalog';
import { clientsRouter } from './routes/clients';
import { invoicesRouter } from './routes/invoices';
import { paymentsRouter } from './routes/payments';
import { milestonesRouter, projectsRouter } from './routes/projects';
import { dashboardRouter, reportsRouter } from './routes/reports';
import { searchRouter } from './routes/search';
import { settingsRouter } from './routes/settings';
import { usersRouter } from './routes/users';
import { refreshOverdue } from './services/payments';

const CLIENT_DIST = fileURLToPath(new URL('../../client/dist/', import.meta.url));

export const app = express();

// In production the app sits behind a proxy that handles HTTPS. Without this, rate limiting would
// see every visitor as the proxy's one address.
if (isProduction) app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        // The invoice template carries its styles inline, and the fonts come from Google.
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: null,
      },
    },
  }),
);
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
// Signature images are bigger than the default limit. Nothing else needs to be.
app.use('/api/settings/signature', express.json({ limit: '1mb' }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/clients', requireAuth, refreshOverdue, clientsRouter);
app.use('/api/projects', requireAuth, refreshOverdue, projectsRouter);
app.use('/api/milestones', requireAuth, milestonesRouter);
app.use('/api/invoices', requireAuth, refreshOverdue, invoicesRouter);
app.use('/api/payments', requireAuth, refreshOverdue, paymentsRouter);
app.use('/api/catalog', requireAuth, catalogRouter);
app.use('/api/dashboard', requireAuth, refreshOverdue, dashboardRouter);
app.use('/api/reports', requireAuth, refreshOverdue, reportsRouter);
app.use('/api/search', requireAuth, searchRouter);
app.use('/api/settings', requireAuth, settingsRouter);
app.use('/api/users', requireAuth, requireRole('ADMIN'), usersRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// In production this one server also delivers the built front end.
if (isProduction && existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (_req, res) => {
    res.sendFile('index.html', { root: CLIENT_DIST });
  });
}

app.use(errorHandler);
