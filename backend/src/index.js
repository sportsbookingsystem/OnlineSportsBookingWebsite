/**
 * Application entry — Express HTTP server
 *
 * - Loads environment variables from `.env` (see `.env.example`).
 * - Registers JSON body parser and CORS for the React origin.
 * - Mounts route modules under `/api/*`.
 * - Central error handler converts HttpError to JSON responses.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import playerRoutes from './routes/playerRoutes.js';
import ownerRoutes from './routes/ownerRoutes.js';
import sponsorRoutes from './routes/sponsorRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import * as paymentController from './controllers/paymentController.js';
import { sendError } from './utils/httpError.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.stripeWebhook,
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'sports-booking-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/player', playerRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/sponsor', sponsorRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, _req, res, _next) => sendError(res, err));

app.listen(PORT, HOST, () => {
  console.log(`API listening on http://${HOST}:${PORT}`);
});
