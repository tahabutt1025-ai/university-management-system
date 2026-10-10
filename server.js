const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ─── Trust proxy (required for rate-limit on Vercel/serverless) ─
app.set('trust proxy', 1);

// ─── Security headers (helmet) ───────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,     // Set via Vercel headers; default blocks CDN fonts
    crossOriginEmbedderPolicy: false
  })
);

// ─── CORS ────────────────────────────────────────────────────────
// Build the allow-list from env vars + Vercel auto-vars
const buildAllowedOrigins = () => {
  const origins = new Set(['http://localhost:5173', 'http://localhost:3000']);

  // Explicit list from FRONTEND_URL (comma-separated)
  if (process.env.FRONTEND_URL) {
    process.env.FRONTEND_URL.split(',').forEach(o => origins.add(o.trim()));
  }
  // Vercel auto-injects VERCEL_URL for the current deployment
  if (process.env.VERCEL_URL) {
    origins.add(`https://${process.env.VERCEL_URL}`);
  }
  return origins;
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin / server-side / curl requests (no Origin header)
      if (!origin) return callback(null, true);

      const allowed = buildAllowedOrigins();

      // Allow any *.vercel.app preview URL (covers branch and PR previews)
      const isVercelPreview = /^https:\/\/[\w-]+\.vercel\.app$/.test(origin);

      if (allowed.has(origin) || isVercelPreview) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(compression());


// Only log in non-production or when explicitly enabled
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_HTTP_LOGS === 'true') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Global rate limits ─────────────────────────────────────
// Strict limit for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// General API limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/', apiLimiter);

// ─── DB Connection (cached for serverless) ───────────────────
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is not defined in environment variables');
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ MongoDB Connected');
    }
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
  }
};

app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/students',      require('./routes/students'));
app.use('/api/teachers',      require('./routes/teachers'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/courses',       require('./routes/courses'));
app.use('/api/attendance',    require('./routes/attendance'));
app.use('/api/grades',        require('./routes/grades'));
app.use('/api/assignments',   require('./routes/assignments'));
app.use('/api/fees',          require('./routes/fees'));
app.use('/api/analytics',     require('./routes/analytics'));
app.use('/api/notifications', require('./routes/notifications'));

// ─── Health check ────────────────────────────────────────────
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'OK',
    message: 'UMS API is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

// ─── 404 for unknown API routes ───────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found.' });
});

// ─── Global error handler ─────────────────────────────────────
// Avoid leaking stack traces in production
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) console.error(err.stack);

  // CORS error
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  res.status(err.status || 500).json({
    success: false,
    message: isDev ? err.message : 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 UMS Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    });
  });
}

module.exports = app;
