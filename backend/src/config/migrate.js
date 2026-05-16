const { getDb } = require('./db');
const db = getDb();

async function migrate() {
  try {
    await db.execPromise("ALTER TABLE candidates ADD COLUMN tx_hash TEXT;");
    console.log('✅ Added tx_hash to candidates');
  } catch (e) {
    if (e.message.includes('duplicate column name')) console.log('ℹ️ tx_hash already exists in candidates');
    else console.error('❌ Error adding tx_hash to candidates:', e.message);
  }

  try {
    await db.execPromise("ALTER TABLE elections ADD COLUMN finalize_tx_hash TEXT;");
    console.log('✅ Added finalize_tx_hash to elections');
  } catch (e) {
    if (e.message.includes('duplicate column name')) console.log('ℹ️ finalize_tx_hash already exists in elections');
    else console.error('❌ Error adding finalize_tx_hash to elections:', e.message);
  }
  
  process.exit(0);
}

migrate();
