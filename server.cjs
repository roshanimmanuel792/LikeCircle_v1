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

const ADJECTIVES = ['Calm','Brave','Swift','Quiet','Bright','Clever','Nimble','Kind','Bold','Sunny'];
const NOUNS = ['Lion','Fox','Owl','Wolf','Hawk','Otter','Panda','Falcon','Dolphin','Badger'];
const genAlias = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 9000 + 1000); // 4-digit number (1000-9999)
  return `${adj}${noun}${num}`;
};

// Generate unique alias with collision checking
const genUniqueAlias = async () => {
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    const alias = genAlias();
    const existing = await pool.query('SELECT id FROM users WHERE alias = $1', [alias]);
    
    if (existing.rows.length === 0) {
      return alias; // Unique alias found
    }
    attempts++;
  }
  
  // Fallback: add timestamp if still can't find unique after 100 tries
  return `${genAlias()}_${Date.now()}`;
};

const mapCircle = (c) => ({
  id: String(c.id),
  name: c.name,
  description: c.description,
  type: c.type || (c.is_private ? 'private' : 'public'),
  isPrivate: c.is_private,
  createdBy: c.created_by,
  createdAt: new Date(c.created_at).getTime(),
  memberCount: Number(c.member_count) || 0,
});

const signAccess = (user) => jwt.sign({ sub: user.id, email: user.email, name: user.name }, APP_JWT_SECRET, { expiresIn: ACCESS_TTL });
const signRefresh = (user) => jwt.sign({ sub: user.id }, APP_REFRESH_SECRET, { expiresIn: REFRESH_TTL });

app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  credentials: true,
}));
app.use(express.json());

// Helpers
const getDbUserBySub = async (googleSub) => {
  const result = await pool.query(
    'SELECT id, google_sub, email, name, avatar, alias FROM users WHERE google_sub = $1',
    [googleSub]
  );
  return result.rows[0];
};

// Auth: Google sign-in -> verify -> issue our tokens
app.post('/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: 'Missing credential token' });

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) return res.status(401).json({ message: 'Invalid token payload' });

    // Check if user exists
    let userResult = await pool.query(
      'SELECT id, google_sub, email, name, avatar, alias FROM users WHERE google_sub = $1',
      [payload.sub]
    );

    let dbUser;
    if (userResult.rows.length === 0) {
      // New user - generate unique alias
      const alias = await genUniqueAlias();
      const insertResult = await pool.query(
        `INSERT INTO users (google_sub, email, name, avatar, alias)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, google_sub, email, name, avatar, alias`,
        [payload.sub, payload.email, payload.name, payload.picture, alias]
      );
      dbUser = insertResult.rows[0];
    } else {
      // Existing user - update info but keep alias and custom avatar
      dbUser = userResult.rows[0];
      if (!dbUser.alias) {
        // Backfill alias for old users
        const alias = await genUniqueAlias();
        await pool.query('UPDATE users SET alias = $1 WHERE id = $2', [alias, dbUser.id]);
        dbUser.alias = alias;
      }
      // Keep the custom avatar if user has set one, otherwise use Google picture
      const avatarToUse = dbUser.avatar || payload.picture;
      await pool.query(
        'UPDATE users SET email=$1, name=$2, avatar=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$4',
        [payload.email, payload.name, avatarToUse, dbUser.id]
      );
    }

    const user = { id: dbUser.google_sub, email: dbUser.email, name: dbUser.name, avatar: dbUser.avatar };

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);
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

// Token refresh
app.post('/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Missing refresh token' });

    const decoded = jwt.verify(refreshToken, APP_REFRESH_SECRET);
    const tokenRow = await pool.query(
      `SELECT id, user_id FROM refresh_tokens WHERE token = $1 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
      [refreshToken]
    );
    if (tokenRow.rows.length === 0) return res.status(401).json({ message: 'Invalid or expired refresh token' });

    const userRow = await pool.query(`SELECT google_sub, email, name FROM users WHERE id = $1`, [tokenRow.rows[0].user_id]);
    if (userRow.rows.length === 0) return res.status(401).json({ message: 'User not found' });

    const user = userRow.rows[0];
    if (user.google_sub !== decoded.sub) return res.status(401).json({ message: 'Token subject mismatch' });

    const accessToken = signAccess({ id: user.google_sub, email: user.email, name: user.name });
    return res.json({ accessToken });
  } catch (error) {
    console.error('Refresh failed', error);
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// Auth middleware
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid auth header' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, APP_JWT_SECRET);
    req.user = decoded; // contains sub=email/name
    next();
  } catch (error) {
    console.error('Token validation failed', error);
    return res.status(401).json({ message: 'Invalid or expired access token' });
  }
};

// Logout (revoke refresh token)
app.post('/auth/logout', authMiddleware, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await pool.query(`UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token = $1`, [refreshToken]);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout failed', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});

// Protected: current user
app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// User profile: get full details
app.get('/api/me/profile', authMiddleware, async (req, res) => {
  try {
    const dbUser = await getDbUserBySub(req.user.sub);
    if (!dbUser) return res.status(404).json({ message: 'User not found' });
    
    res.json({
      id: dbUser.google_sub,
      databaseId: String(dbUser.id), // Add database ID for internal use
      email: dbUser.email,
      name: dbUser.name,
      avatar: dbUser.avatar,
      alias: dbUser.alias,
    });
  } catch (error) {
    console.error('Get profile failed', error);
    res.status(500).json({ message: 'Failed to get profile' });
  }
});

// User profile: update avatar
app.put('/api/me/profile', authMiddleware, async (req, res) => {
  try {
    const { avatar } = req.body;
    const dbUser = await getDbUserBySub(req.user.sub);
    if (!dbUser) return res.status(404).json({ message: 'User not found' });
    
    await pool.query(
      'UPDATE users SET avatar = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [avatar, dbUser.id]
    );
    
    res.json({ message: 'Profile updated', avatar });
  } catch (error) {
    console.error('Update profile failed', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Get user's circles
app.get('/api/me/circles', authMiddleware, async (req, res) => {
  try {
    const dbUser = await getDbUserBySub(req.user.sub);
    if (!dbUser) return res.status(404).json({ message: 'User not found' });
    
    const result = await pool.query(`
      SELECT c.id, c.name, c.description, c.type, c.is_private, c.created_at, m.joined_at
      FROM memberships m
      JOIN circles c ON c.id = m.circle_id
      WHERE m.user_id = $1
      ORDER BY m.joined_at DESC
    `, [dbUser.id]);
    
    const circles = result.rows.map(row => ({
      ...mapCircle(row),
      joinedAt: new Date(row.joined_at).getTime(),
    }));
    
    res.json({ circles });
  } catch (error) {
    console.error('Get user circles failed', error);
    res.status(500).json({ message: 'Failed to get circles' });
  }
});

// Get user's messages
app.get('/api/me/messages', authMiddleware, async (req, res) => {
  try {
    const dbUser = await getDbUserBySub(req.user.sub);
    if (!dbUser) return res.status(404).json({ message: 'User not found' });
    
    const result = await pool.query(`
      SELECT 
        msg.id, msg.content, msg.created_at, msg.circle_id, msg.is_deleted,
        c.name as circle_name,
        msg.alias
      FROM messages msg
      JOIN circles c ON c.id = msg.circle_id
      WHERE msg.user_id = $1
      ORDER BY msg.created_at DESC
      LIMIT 100
    `, [dbUser.id]);
    
    const messages = result.rows.map(row => ({
      id: String(row.id),
      content: row.content,
      createdAt: new Date(row.created_at).getTime(),
      circleId: String(row.circle_id),
      circleName: row.circle_name,
      alias: row.alias,
      isDeleted: row.is_deleted,
    }));
    
    res.json({ messages });
  } catch (error) {
    console.error('Get user messages failed', error);
    res.status(500).json({ message: 'Failed to get messages' });
  }
});

// Circles: list
app.get('/api/circles', authMiddleware, async (req, res) => {
  try {
    const dbUser = await getDbUserBySub(req.user.sub);
    if (!dbUser) return res.status(404).json({ message: 'User not found' });

    // Get only circles created by user OR where user is a member
    const result = await pool.query(`
      SELECT DISTINCT c.id, c.name, c.description, c.type, c.is_private, c.created_by, c.created_at, COALESCE(COUNT(m.id),0) AS member_count
      FROM circles c
      LEFT JOIN memberships m ON m.circle_id = c.id
      WHERE c.created_by = $1 OR EXISTS (
        SELECT 1 FROM memberships WHERE user_id = $1 AND circle_id = c.id
      )
      GROUP BY c.id
      ORDER BY c.created_at DESC;
    `, [dbUser.id]);
    const circles = result.rows.map(mapCircle);
    res.json({ circles });
  } catch (error) {
    console.error('List circles failed', error);
    res.status(500).json({ message: 'Failed to list circles' });
  }
});

// Circles: discover (public circles for non-members)
app.get('/api/circles/discover', authMiddleware, async (req, res) => {
  try {
    const dbUser = await getDbUserBySub(req.user.sub);
    if (!dbUser) return res.status(404).json({ message: 'User not found' });

    const search = req.query.search ? `%${req.query.search}%` : '%';

    // Get all circles (public and private) that user hasn't joined yet
    const result = await pool.query(`
      SELECT c.id, c.name, c.description, c.type, c.is_private, c.created_by, c.created_at, COALESCE(COUNT(m.id),0) AS member_count
      FROM circles c
      LEFT JOIN memberships m ON m.circle_id = c.id
      WHERE (c.name ILIKE $1 OR c.description ILIKE $1)
        AND NOT EXISTS (
          SELECT 1 FROM memberships WHERE user_id = $2 AND circle_id = c.id
        )
      GROUP BY c.id
      ORDER BY c.created_at DESC;
    `, [search, dbUser.id]);
    const circles = result.rows.map(mapCircle);
    res.json({ circles });
  } catch (error) {
    console.error('Discover circles failed', error);
    res.status(500).json({ message: 'Failed to discover circles' });
  }
});

// Circles: detail
app.get('/api/circles/:id', authMiddleware, async (req, res) => {
  try {
    const circleId = Number(req.params.id);
    if (Number.isNaN(circleId)) return res.status(400).json({ message: 'Invalid circle id' });

    const result = await pool.query(
      `SELECT c.id, c.name, c.description, c.type, c.is_private, c.created_by, c.created_at, COALESCE(COUNT(m.id),0) AS member_count
       FROM circles c
       LEFT JOIN memberships m ON m.circle_id = c.id
       WHERE c.id = $1
       GROUP BY c.id`,
      [circleId]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Circle not found' });
    res.json({ circle: mapCircle(result.rows[0]) });
  } catch (error) {
    console.error('Get circle failed', error);
    res.status(500).json({ message: 'Failed to fetch circle' });
  }
});

// Circles: create
app.post('/api/circles', authMiddleware, async (req, res) => {
  try {
    const { name, description, type, password } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const circleType = type === 'private' ? 'private' : 'public';
    const isPrivate = circleType === 'private';

    const userRow = await getDbUserBySub(req.user.sub);
    if (!userRow) return res.status(401).json({ message: 'User not found' });

    const result = await pool.query(
      `INSERT INTO circles (created_by, name, description, type, is_private, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, description, type, is_private, created_by, created_at`,
      [userRow.id, name, description || '', circleType, isPrivate, isPrivate ? password || '' : null]
    );

    const c = result.rows[0];

    // Add creator as a member automatically
    await pool.query(
      `INSERT INTO memberships (user_id, circle_id) VALUES ($1, $2)`,
      [userRow.id, c.id]
    );

    res.status(201).json({
      circle: {
        id: String(c.id),
        name: c.name,
        description: c.description,
        type: c.type,
        isPrivate: c.is_private,
        createdBy: c.created_by,
        createdAt: new Date(c.created_at).getTime(),
        memberCount: 1,
      }
    });
  } catch (error) {
    console.error('Create circle failed', error);
    res.status(500).json({ message: 'Failed to create circle' });
  }
});

// Circles: join
app.post('/api/circles/:id/join', authMiddleware, async (req, res) => {
  try {
    const circleId = Number(req.params.id);
    const { password } = req.body;
    if (Number.isNaN(circleId)) return res.status(400).json({ message: 'Invalid circle id' });

    const circleRes = await pool.query('SELECT * FROM circles WHERE id = $1', [circleId]);
    if (circleRes.rows.length === 0) return res.status(404).json({ message: 'Circle not found' });
    const circle = circleRes.rows[0];

    if (circle.is_private && circle.password_hash !== (password || '')) {
      return res.status(403).json({ message: 'Incorrect password' });
    }

    const userRow = await getDbUserBySub(req.user.sub);
    if (!userRow) return res.status(401).json({ message: 'User not found' });

    const existing = await pool.query('SELECT * FROM memberships WHERE user_id = $1 AND circle_id = $2', [userRow.id, circleId]);
    if (existing.rows.length > 0) {
      const m = existing.rows[0];
      return res.json({ membership: { id: String(m.id), userId: String(userRow.id), circleId: String(circleId), alias: m.alias, joinedAt: new Date(m.joined_at).getTime() } });
    }

    const insert = await pool.query(
      `INSERT INTO memberships (user_id, circle_id, alias)
       VALUES ($1, $2, $3)
       RETURNING id, alias, joined_at`,
      [userRow.id, circleId, userRow.alias]
    );
    const m = insert.rows[0];
    res.status(201).json({ membership: { id: String(m.id), userId: String(userRow.id), circleId: String(circleId), alias: m.alias, joinedAt: new Date(m.joined_at).getTime() } });
  } catch (error) {
    console.error('Join circle failed', error);
    res.status(500).json({ message: 'Failed to join circle' });
  }
});

// Circles: leave
app.delete('/api/circles/:id/leave', authMiddleware, async (req, res) => {
  try {
    const circleId = Number(req.params.id);
    if (Number.isNaN(circleId)) return res.status(400).json({ message: 'Invalid circle id' });

    const userRow = await getDbUserBySub(req.user.sub);
    if (!userRow) return res.status(401).json({ message: 'User not found' });

    // Delete the membership
    const result = await pool.query(
      'DELETE FROM memberships WHERE user_id = $1 AND circle_id = $2 RETURNING id',
      [userRow.id, circleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Not a member of this circle' });
    }

    res.json({ message: 'Successfully left the circle' });
  } catch (error) {
    console.error('Leave circle failed', error);
    res.status(500).json({ message: 'Failed to leave circle' });
  }
});

// Circles: get membership for current user
app.get('/api/circles/:id/membership', authMiddleware, async (req, res) => {
  try {
    const circleId = Number(req.params.id);
    if (Number.isNaN(circleId)) return res.status(400).json({ message: 'Invalid circle id' });

    const userRow = await getDbUserBySub(req.user.sub);
    if (!userRow) return res.status(401).json({ message: 'User not found' });

    const membershipRes = await pool.query('SELECT * FROM memberships WHERE user_id = $1 AND circle_id = $2', [userRow.id, circleId]);
    if (membershipRes.rows.length === 0) return res.status(404).json({ message: 'Not a member' });

    const m = membershipRes.rows[0];
    res.json({ membership: { id: String(m.id), userId: String(userRow.id), circleId: String(circleId), alias: m.alias, joinedAt: new Date(m.joined_at).getTime() } });
  } catch (error) {
    console.error('Get membership failed', error);
    res.status(500).json({ message: 'Failed to fetch membership' });
  }
});

// Messages: list for circle
app.get('/api/circles/:id/messages', authMiddleware, async (req, res) => {
  try {
    const circleId = Number(req.params.id);
    if (Number.isNaN(circleId)) return res.status(400).json({ message: 'Invalid circle id' });

    const result = await pool.query(
      `SELECT m.id, m.circle_id, m.membership_id, m.alias, m.content, m.parent_message_id, m.created_at, m.user_id, u.avatar
       FROM messages m
       LEFT JOIN users u ON u.id = m.user_id
       WHERE m.circle_id = $1 AND m.is_deleted = FALSE
       ORDER BY m.created_at DESC`,
      [circleId]
    );

    const messages = result.rows.map((m) => ({
      id: String(m.id),
      circleId: String(m.circle_id),
      membershipId: m.membership_id ? String(m.membership_id) : '',
      alias: m.alias || 'Anon',
      avatar: m.avatar || undefined,
      userId: m.user_id ? String(m.user_id) : undefined,
      content: m.content,
      parentId: m.parent_message_id ? String(m.parent_message_id) : undefined,
      timestamp: new Date(m.created_at).getTime(),
    }));

    res.json({ messages });
  } catch (error) {
    console.error('List messages failed', error);
    res.status(500).json({ message: 'Failed to list messages' });
  }
});

// Messages: post
app.post('/api/circles/:id/messages', authMiddleware, async (req, res) => {
  try {
    const circleId = Number(req.params.id);
    const { content, parentId } = req.body;
    if (Number.isNaN(circleId)) return res.status(400).json({ message: 'Invalid circle id' });
    if (!content) return res.status(400).json({ message: 'Content is required' });

    const userRow = await getDbUserBySub(req.user.sub);
    if (!userRow) return res.status(401).json({ message: 'User not found' });

    const membershipRes = await pool.query('SELECT * FROM memberships WHERE user_id = $1 AND circle_id = $2', [userRow.id, circleId]);
    if (membershipRes.rows.length === 0) return res.status(403).json({ message: 'Join circle first' });
    const membership = membershipRes.rows[0];

    const insert = await pool.query(
      `INSERT INTO messages (circle_id, membership_id, user_id, alias, content, parent_message_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [circleId, membership.id, userRow.id, membership.alias, content, parentId ? Number(parentId) : null]
    );

    const m = insert.rows[0];
    res.status(201).json({
      message: {
        id: String(m.id),
        circleId: String(circleId),
        membershipId: String(membership.id),
        alias: membership.alias,
        content,
        parentId: parentId ? String(parentId) : undefined,
        timestamp: new Date(m.created_at).getTime(),
      }
    });
  } catch (error) {
    console.error('Post message failed', error);
    res.status(500).json({ message: 'Failed to post message' });
  }
});

// Messages: delete
app.delete('/api/messages/:id', authMiddleware, async (req, res) => {
  try {
    const msgId = Number(req.params.id);
    if (Number.isNaN(msgId)) return res.status(400).json({ message: 'Invalid message id' });
    
    // Get message to check ownership
    const msgRow = await pool.query('SELECT user_id FROM messages WHERE id = $1', [msgId]);
    if (msgRow.rows.length === 0) return res.status(404).json({ message: 'Message not found' });
    
    // Get current user
    const dbUser = await getDbUserBySub(req.user.sub);
    if (!dbUser) return res.status(401).json({ message: 'User not found' });
    
    // Only allow deletion by message author
    if (msgRow.rows[0].user_id !== dbUser.id) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }
    
    // Mark as deleted
    await pool.query('UPDATE messages SET is_deleted = TRUE WHERE id = $1', [msgId]);
    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message failed', error);
    res.status(500).json({ message: 'Failed to delete message' });
  }
});

// Messages: report
app.post('/api/messages/:id/report', authMiddleware, async (req, res) => {
  try {
    const msgId = Number(req.params.id);
    if (Number.isNaN(msgId)) return res.status(400).json({ message: 'Invalid message id' });
    await pool.query('UPDATE messages SET is_reported = TRUE WHERE id = $1', [msgId]);
    res.json({ message: 'Reported' });
  } catch (error) {
    console.error('Report failed', error);
    res.status(500).json({ message: 'Failed to report message' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Auth verifier running on http://localhost:${port}`);
});
