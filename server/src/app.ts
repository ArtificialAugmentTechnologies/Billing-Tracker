import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './lib/http';
import { requireAuth } from './middleware/auth';
import { authRouter } from './routes/auth';
import { catalogRouter } from './routes/catalog';
import { clientsRouter } from './routes/clients';
import { invoicesRouter } from './routes/invoices';
import { paymentsRouter } from './routes/payments';
import { milestonesRouter, projectsRouter } from './routes/projects';
import { refreshOverdue } from './services/payments';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
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

app.use(errorHandler);
