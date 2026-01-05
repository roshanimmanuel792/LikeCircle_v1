require('dotenv').config();
const { pool } = require('./db.cjs');

const ADJECTIVES = ['Calm','Brave','Swift','Quiet','Bright','Clever','Nimble','Kind','Bold','Sunny'];
const NOUNS = ['Lion','Fox','Owl','Wolf','Hawk','Otter','Panda','Falcon','Dolphin','Badger'];
const genAlias = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}${noun}${Math.floor(1000 + Math.random() * 9000)}`;
};

async function migrateAliases() {
  try {
    // Get all users without an alias
    const result = await pool.query('SELECT id FROM users WHERE alias IS NULL');
    console.log(`Found ${result.rows.length} users without aliases`);
    
    // Generate and update aliases for each user
    for (const user of result.rows) {
      const alias = genAlias();
      await pool.query('UPDATE users SET alias = $1 WHERE id = $2', [alias, user.id]);
      console.log(`Updated user ${user.id} with alias: ${alias}`);
    }
    
    console.log('✅ Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateAliases();
