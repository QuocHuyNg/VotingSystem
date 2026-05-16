const { getDb } = require("./db");
const bcrypt = require("bcryptjs");

async function initDb() {
  const db = getDb();

  // Helper for sequential execution
  const run = (sql) => db.execPromise(sql);

  try {
    // Users table
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'voter' CHECK(role IN ('admin','voter')),
        wallet_address TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Elections metadata cache
    await run(`
      CREATE TABLE IF NOT EXISTS elections (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        start_time INTEGER,
        end_time INTEGER,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','active','ended','finalized')),
        contract_address TEXT,
        tx_hash TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Candidates metadata
    await run(`
      CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        election_id INTEGER REFERENCES elections(id) ON DELETE CASCADE,
        on_chain_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Authorized voters
    await run(`
      CREATE TABLE IF NOT EXISTS authorized_voters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        election_id INTEGER REFERENCES elections(id) ON DELETE CASCADE,
        wallet_address TEXT NOT NULL COLLATE NOCASE,
        user_id INTEGER REFERENCES users(id),
        tx_hash TEXT,
        authorized_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(election_id, wallet_address)
      )
    `);

    // Vote receipts
    await run(`
      CREATE TABLE IF NOT EXISTS vote_receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        election_id INTEGER REFERENCES elections(id),
        voter_wallet TEXT NOT NULL,
        tx_hash TEXT UNIQUE NOT NULL,
        vote_hash TEXT,
        block_number INTEGER,
        voted_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create default admin if none exists
    const adminExists = await db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
    if (!adminExists) {
      const hash = bcrypt.hashSync("admin123", 10);
      await db.prepare(`
        INSERT INTO users (username, email, password_hash, role)
        VALUES (?, ?, ?, 'admin')
      `).run("admin", "admin@voting.com", hash);
      console.log("✅ Default admin created: admin@voting.com / admin123");
    }

    console.log("✅ Database initialized successfully");
  } catch (err) {
    console.error("❌ Database initialization failed:", err);
  }
}

module.exports = { initDb };
