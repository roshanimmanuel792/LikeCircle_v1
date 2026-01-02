require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { pool } = require('./db.cjs');

const app = express();
const port = process.env.PORT || 4000;
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const APP_JWT_SECRET = process.env.APP_JWT_SECRET || 'change-me';
const APP_REFRESH_SECRET = process.env.APP_REFRESH_SECRET || 'change-me-refresh';
const ACCESS_TTL = process.env.ACCESS_TTL || '15m';
const REFRESH_TTL = process.env.REFRESH_TTL || '7d';

const signAccess = (user) => jwt.sign({ sub: user.id, email: user.email, name: user.name }, APP_JWT_SECRET, { expiresIn: ACCESS_TTL });
const signRefresh = (user) => jwt.sign({ sub: user.id }, APP_REFRESH_SECRET, { expiresIn: REFRESH_TTL });

app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  credentials: true,
}));
app.use(express.json());

app.post('/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Missing credential token' });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    // Upsert user in database
    const result = await pool.query(
      `INSERT INTO users (google_sub, email, name, avatar) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (google_sub) DO UPDATE SET email=$2, name=$3, avatar=$4, updated_at=CURRENT_TIMESTAMP
       RETURNING id, google_sub, email, name, avatar`,
      [payload.sub, payload.email, payload.name, payload.picture]
    );

    const dbUser = result.rows[0];
    const user = {
      id: dbUser.google_sub,
      email: dbUser.email,
      name: dbUser.name,
      avatar: dbUser.avatar,
    };

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);
    
    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [dbUser.id, refreshToken, expiresAt]
    );

    return res.json({ user, token: credential, accessToken, refreshToken });
  } catch (error) {
    console.error('Google auth verification failed', error);
    return res.status(401).json({ message: 'Invalid Google token' });
  }
});

app.post('/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Missing refresh token' });
    }

    // Verify JWT signature
    const decoded = jwt.verify(refreshToken, APP_REFRESH_SECRET);
    
    // Check if token exists in database and is not revoked
    const result = await pool.query(
      `SELECT id, user_id FROM refresh_tokens 
       WHERE token = $1 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
      [refreshToken]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    // Get user info for new access token
    const userResult = await pool.query(
      `SELECT google_sub, email, name FROM users WHERE id = $1`,
      [decoded.sub]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];
    const accessToken = signAccess({ id: user.google_sub, email: user.email, name: user.name });
    return res.json({ accessToken });
  } catch (error) {
    console.error('Refresh failed', error);
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
});

app.post('/auth/logout', authMiddleware, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await pool.query(
        `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token = $1`,
        [refreshToken]
      );
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout failed', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Auth middleware to validate access tokens
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid auth header' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, APP_JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token validation failed', error);
    return res.status(401).json({ message: 'Invalid or expired access token' });
  }
};

// Example protected route (ready for API calls)
app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.listen(port, () => {
  console.log(`Auth verifier running on http://localhost:${port}`);
});
