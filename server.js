require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const path = require('path');

// Validate USERS env var on startup
let parsedUsers;
try {
  parsedUsers = JSON.parse(process.env.USERS || '');
  if (!Array.isArray(parsedUsers) || parsedUsers.length === 0) throw new Error();
} catch {
  console.error('ERROR: USERS environment variable must be a non-empty JSON array.');
  console.error('Example: USERS=\'[{"username":"vera","password":"$2a$10$..."}]\'');
  console.error('Generate a hash: node -e "require(\'bcryptjs\').hash(\'yourpass\',10).then(console.log)"');
  process.exit(1);
}

const requireAuth = require('./middleware/requireAuth');
const authRoutes = require('./routes/auth');
const runnerRoutes = require('./routes/runner');
const plansRoutes = require('./routes/plans');
const testsRoutes = require('./routes/tests');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
    },
  },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd,
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  },
}));

// Dev-only bypass (never runs in production)
if (!isProd) {
  app.get('/__dev_login', (req, res) => {
    req.session.user = { username: 'vera' };
    res.redirect('/dashboard');
  });
}

// Public routes
app.get('/', (req, res) => {
  if (req.session && req.session.user) return res.redirect('/dashboard');
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.session && req.session.user) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

app.use('/auth', authRoutes);

// Auth-gated routes
app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

app.use('/api', requireAuth, runnerRoutes);
app.use('/api/plans', requireAuth, plansRoutes);
app.use('/api/tests', requireAuth, testsRoutes);

app.listen(PORT, () => {
  console.log(`WDG QA Runner started on http://localhost:${PORT}`);
  console.log(`Users loaded: ${parsedUsers.map(u => u.username).join(', ')}`);
});
