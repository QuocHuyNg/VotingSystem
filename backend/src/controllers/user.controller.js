const { getDb } = require("../config/db");

// GET /api/users
async function getAllUsers(req, res) {
  try {
    const db = getDb();
    const users = await db.prepare("SELECT id, username, email, role, wallet_address, is_active, created_at FROM users ORDER BY created_at DESC").all();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// GET /api/voters/:electionId
async function getElectionVoters(req, res) {
  try {
    const db = getDb();
    const voters = await db.prepare(`
      SELECT vr.voter_wallet as wallet_address, vr.tx_hash as vote_tx_hash, vr.voted_at,
             u.username, u.email, 1 as has_voted
      FROM vote_receipts vr
      LEFT JOIN users u ON LOWER(vr.voter_wallet) = LOWER(u.wallet_address)
      WHERE vr.election_id = ?
      ORDER BY vr.voted_at DESC
    `).all(req.params.electionId);
    res.json({ success: true, voters });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// POST /api/voters/:electionId/authorize
async function authorizeVoter(req, res) {
  try {
    const { wallet_address, tx_hash } = req.body;
    if (!wallet_address)
      return res.status(400).json({ success: false, message: "wallet_address required" });

    const db = getDb();
    const election = await db.prepare("SELECT id FROM elections WHERE id = ?").get(req.params.electionId);
    if (!election) return res.status(404).json({ success: false, message: "Election not found" });

    const existing = await db.prepare(
      "SELECT id FROM authorized_voters WHERE election_id = ? AND LOWER(wallet_address) = LOWER(?)"
    ).get(req.params.electionId, wallet_address);
    if (existing)
      return res.status(409).json({ success: false, message: "Voter already authorized" });

    // Try to link to user if they have this wallet
    const user = await db.prepare("SELECT id FROM users WHERE LOWER(wallet_address) = LOWER(?)").get(wallet_address);

    await db.prepare(`
      INSERT INTO authorized_voters (election_id, wallet_address, user_id, tx_hash)
      VALUES (?, ?, ?, ?)
    `).run(req.params.electionId, wallet_address.toLowerCase(), user?.id || null, tx_hash || null);

    res.status(201).json({ success: true, message: "Voter authorized" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// POST /api/voters/:electionId/authorize-batch
async function authorizeVotersBatch(req, res) {
  try {
    const { wallet_addresses, tx_hash } = req.body;
    if (!Array.isArray(wallet_addresses) || wallet_addresses.length === 0)
      return res.status(400).json({ success: false, message: "wallet_addresses array required" });

    const db = getDb();
    let added = 0;
    let skipped = 0;

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO authorized_voters (election_id, wallet_address, tx_hash)
      VALUES (?, ?, ?)
    `);

    // Simple loop for now (for production use a transaction)
    for (const addr of wallet_addresses) {
      if (!addr || typeof addr !== "string") { skipped++; continue; }
      try {
        const result = await stmt.run(req.params.electionId, addr.toLowerCase(), tx_hash || null);
        if (result.changes > 0) added++;
        else skipped++;
      } catch { skipped++; }
    }

    res.json({ success: true, message: `Authorized ${added} voters, skipped ${skipped}`, added, skipped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// DELETE /api/voters/:electionId/:wallet
async function revokeVoter(req, res) {
  try {
    const db = getDb();
    const result = await db.prepare(
      "DELETE FROM authorized_voters WHERE election_id = ? AND LOWER(wallet_address) = LOWER(?)"
    ).run(req.params.electionId, req.params.wallet);

    if (result.changes === 0)
      return res.status(404).json({ success: false, message: "Voter not found" });

    res.json({ success: true, message: "Voter authorization revoked" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { getAllUsers, getElectionVoters, authorizeVoter, authorizeVotersBatch, revokeVoter };
