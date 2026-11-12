import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config, isProd } from './config.js';
import { db, migrate, isEmpty, driverName } from './db/index.js';
import { HttpError } from './utils/validate.js';

import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import appointmentRoutes from './routes/appointments.js';
import ehrRoutes from './routes/ehr.js';
import prescriptionRoutes from './routes/prescriptions.js';
import pharmacyRoutes from './routes/pharmacy.js';
import labRoutes from './routes/labs.js';
import billingRoutes from './routes/billing.js';
import reportRoutes from './routes/reports.js';
import staffRoutes from './routes/staff.js';
import dashboardRoutes from './routes/dashboard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy', 1);
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Compact request log.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const mark = res.statusCode >= 500 ? '!!' : res.statusCode >= 400 ? ' !' : '  ';
    console.log(`${mark} ${res.statusCode} ${req.method.padEnd(6)} ${req.originalUrl} ${ms}ms`);
  });
  next();
});

app.get('/api/health', async (_req, res) => {
  let staffCount = 0;
  try {
    const row = await db.get('SELECT COUNT(*) AS n FROM staff');
    staffCount = Number(row?.n ?? 0);
  } catch {
    staffCount = 0;
  }
  res.json({
    status: 'ok',
    driver: driverName,
    staffCount,
    env: config.env,
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/ehr', ehrRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/staff', staffRoutes);

// Serve the built client in production so the whole system runs on one origin.
if (isProd) {
  const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: `No route for ${req.method} ${req.path}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: 'validation_error',
      message: err.message,
      fields: err.details,
    });
  }

  // SQLite constraint violations surface as readable messages.
  const raw = String(err?.message ?? '');
  if (raw.includes('UNIQUE constraint failed')) {
    return res.status(409).json({ error: 'conflict', message: 'That record already exists.' });
  }
  if (raw.includes('FOREIGN KEY constraint failed')) {
    return res.status(409).json({
      error: 'conflict',
      message: 'That change would break a linked record.',
    });
  }
  if (raw.includes('CHECK constraint failed')) {
    return res.status(400).json({ error: 'validation_error', message: 'Invalid value supplied.' });
  }

  console.error('[error]', err);
  return res.status(500).json({ error: 'server_error', message: 'Unexpected server error.' });
});

async function start() {
  await migrate();

  if (await isEmpty()) {
    console.log('[db] empty database detected - run `npm run seed` to load demo data');
  }

  app.listen(config.port, () => {
    console.log(`\n  HMS API  ·  http://localhost:${config.port}`);
    console.log(`  driver  ·  ${driverName}`);
    console.log(`  env     ·  ${config.env}\n`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;