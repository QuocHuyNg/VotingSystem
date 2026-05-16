const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'voting_blockchain.sqlite');
const db = new sqlite3.Database(dbPath);

function query(sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function dump() {
  try {
    console.log('=== DATABASE DUMP ===\n');

    console.log('--- USERS ---');
    const users = await query('SELECT id, username, email, role, wallet_address FROM users');
    console.table(users);

    console.log('\n--- ELECTIONS ---');
    const elections = await query('SELECT id, name, status, created_at, tx_hash FROM elections');
    console.table(elections);

    console.log('\n--- CANDIDATES ---');
    const candidates = await query('SELECT id, election_id, name, on_chain_id FROM candidates');
    console.table(candidates);

    console.log('\n--- VOTE RECEIPTS ---');
    const votes = await query('SELECT id, election_id, voter_wallet, tx_hash, voted_at FROM vote_receipts');
    console.table(votes);

  } catch (err) {
    console.error('Error dumping database:', err.message);
  } finally {
    db.close();
  }
}

dump();
