import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './lib/http';
import { requireAuth } from './middleware/auth';
import { authRouter } from './routes/auth';
import { clientsRouter } from './routes/clients';
import { invoicesRouter } from './routes/invoices';
import { milestonesRouter, projectsRouter } from './routes/projects';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/clients', requireAuth, clientsRouter);
app.use('/api/projects', requireAuth, projectsRouter);
app.use('/api/milestones', requireAuth, milestonesRouter);
app.use('/api/invoices', requireAuth, invoicesRouter);

app.use(errorHandler);
