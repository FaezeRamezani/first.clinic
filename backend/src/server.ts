import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { checkDbConnection } from './config/database';
import { settingsRouter } from './modules/settings/settings.router';
import { doctorsRouter } from './modules/doctors/doctors.router';
import { servicesRouter } from './modules/services/services.router';
import { paymentAccountsRouter } from './modules/paymentAccounts/paymentAccounts.router';
import { patientsRouter } from './modules/patients/patients.router';

import { appointmentsRouter } from './modules/appointments/appointments.router';
import { financeRouter } from './modules/finance/finance.router';
import { followupsRouter } from './modules/followups/followups.router';
import { onlineRequestsRouter } from './modules/onlineRequests/onlineRequests.router';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '127.0.0.1';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const app = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname'
      }
    }
  }
});

// Register CORS for Frontend local development
await app.register(cors, {
  origin: [CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
});

// GET /api/health endpoint
app.get('/api/health', async (request, reply) => {
  const isDbConnected = checkDbConnection();

  if (isDbConnected) {
    return reply.status(200).send({
      ok: true,
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } else {
    return reply.status(500).send({
      ok: false,
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

// Register Phase 2 & 3 & 4 & 5 & 6 Routers
await app.register(settingsRouter, { prefix: '/api/settings' });
await app.register(doctorsRouter, { prefix: '/api/doctors' });
await app.register(servicesRouter, { prefix: '/api/services' });
await app.register(paymentAccountsRouter, { prefix: '/api/payment-accounts' });
await app.register(patientsRouter, { prefix: '/api/patients' });
await app.register(appointmentsRouter, { prefix: '/api/appointments' });
await app.register(financeRouter, { prefix: '/api/finance' });
await app.register(followupsRouter, { prefix: '/api/tasks' });
await app.register(onlineRequestsRouter, { prefix: '/api/online-requests' });

// Start Server
const start = async () => {
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`[Backend Server] Server running at http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
