const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'likecircle',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Initialize database schema
const initDb = async () => {
  try {
    await pool.query('BEGIN');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_sub VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        avatar TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        revoked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS circles (
        id SERIAL PRIMARY KEY,
        created_by INTEGER REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(20) DEFAULT 'public',
        is_private BOOLEAN DEFAULT FALSE,
        password_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS memberships (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        circle_id INTEGER REFERENCES circles(id) ON DELETE CASCADE,
        alias VARCHAR(255) NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, circle_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        circle_id INTEGER REFERENCES circles(id) ON DELETE CASCADE,
        membership_id INTEGER REFERENCES memberships(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        alias VARCHAR(255),
        content TEXT NOT NULL,
        parent_message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
        is_reported BOOLEAN DEFAULT FALSE,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure newer columns exist if tables were created earlier
    await pool.query("ALTER TABLE circles ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'public';");
    await pool.query("ALTER TABLE memberships ADD CONSTRAINT IF NOT EXISTS unique_user_circle UNIQUE (user_id, circle_id);");
    await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS alias VARCHAR(255);");
    await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS membership_id INTEGER REFERENCES memberships(id) ON DELETE SET NULL;");
    await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;");

    await pool.query("CREATE INDEX IF NOT EXISTS idx_messages_circle ON messages(circle_id);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_memberships_circle ON memberships(circle_id);");

    await pool.query('COMMIT');
    console.log('✅ Database schema initialized');
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Database initialization failed:', error.message);
  }
};

initDb();

module.exports = { pool, initDb };
