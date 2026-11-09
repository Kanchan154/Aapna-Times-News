require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const http = require('http');
const connectDB = require('./config/db');
const app = require('./app');
const { initRealtime } = require('./utils/realtime');

const PORT = process.env.PORT || 5000;

(async () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) {
    console.error('JWT_SECRET is missing or too short (use 24+ characters). Check server/.env');
    process.exit(1);
  }
  await connectDB();
  const server = http.createServer(app);
  initRealtime(server, (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim()));
  server.listen(PORT, () => console.log(`Aapna Times API running on http://localhost:${PORT}`));

  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
})().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
