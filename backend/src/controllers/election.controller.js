const { getDb } = require("../config/db");

// GET /api/elections
async function getAllElections(req, res) {
  try {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    
    const elections = await db.prepare(`
      SELECT e.*, u.username as creator_name,
        (SELECT COUNT(*) FROM candidates WHERE election_id = e.id) as candidate_count,
        (SELECT COUNT(*) FROM vote_receipts WHERE election_id = e.id) as voter_count,
        (SELECT COUNT(*) FROM vote_receipts WHERE election_id = e.id) as vote_count
      FROM elections e
      LEFT JOIN users u ON e.created_by = u.id
      ORDER BY e.created_at DESC
    `).all();

    // Map dynamic status consistently
    const mappedElections = elections.map(e => {
      if (e.status === 'finalized') return e;
      let calculatedStatus = 'active';
      if (now < e.start_time) calculatedStatus = 'pending';
      else if (now >= e.end_time) calculatedStatus = 'ended';
      return { ...e, status: calculatedStatus };
    });

    res.json({ success: true, elections: mappedElections });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// GET /api/elections/:id
async function getElectionById(req, res) {
  try {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    
    const election = await db.prepare(`
      SELECT e.*, u.username as creator_name
      FROM elections e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = ?
    `).get(req.params.id);

    if (!election) return res.status(404).json({ success: false, message: "Election not found" });

    // Calculate status consistently
    let calculatedStatus = 'active';
    if (now < election.start_time) calculatedStatus = 'pending';
    else if (now >= election.end_time) calculatedStatus = 'ended';
    if (election.status === 'finalized') calculatedStatus = 'finalized';

    const candidates = await db.prepare("SELECT * FROM candidates WHERE election_id = ? ORDER BY on_chain_id").all(req.params.id);
    const voterCount = await db.prepare("SELECT COUNT(*) as count FROM vote_receipts WHERE election_id = ?").get(req.params.id);
    const voteCount = voterCount;

    res.json({ success: true, election: { ...election, status: calculatedStatus }, candidates, voterCount: voterCount.count, voteCount: voteCount.count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// POST /api/elections
async function createElection(req, res) {
  try {
    const { id, name, description, start_time, end_time, tx_hash, contract_address } = req.body;
    if (!id || !name || !start_time || !end_time)
      return res.status(400).json({ success: false, message: "Missing required fields" });

    const db = getDb();
    const existing = await db.prepare("SELECT id, contract_address FROM elections WHERE id = ?").get(id);
    if (existing) {
      if (existing.contract_address !== contract_address) {
        // Redepolyed: clean up old data for this ID
        await db.prepare("DELETE FROM elections WHERE id = ?").run(id);
        await db.prepare("DELETE FROM candidates WHERE election_id = ?").run(id);
        await db.prepare("DELETE FROM vote_receipts WHERE election_id = ?").run(id);
      } else {
        return res.status(409).json({ success: false, message: "Election ID already exists" });
      }
    }

    await db.prepare(`
      INSERT INTO elections (id, name, description, start_time, end_time, status, tx_hash, contract_address, created_by)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `).run(id, name, description || "", start_time, end_time, tx_hash || null, contract_address || null, req.user.id);

    const election = await db.prepare("SELECT * FROM elections WHERE id = ?").get(id);
    res.status(201).json({ success: true, message: "Election created", election });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// PUT /api/elections/:id/status
async function updateElectionStatus(req, res) {
  try {
    const { status, finalize_tx_hash } = req.body;
    const validStatuses = ["pending", "active", "ended", "finalized"];
    if (!validStatuses.includes(status))
      return res.status(400).json({ success: false, message: "Invalid status" });

    const db = getDb();
    const election = await db.prepare("SELECT id FROM elections WHERE id = ?").get(req.params.id);
    if (!election) return res.status(404).json({ success: false, message: "Election not found" });

    if (status === 'finalized' && finalize_tx_hash) {
      await db.prepare("UPDATE elections SET status = ?, finalize_tx_hash = ? WHERE id = ?").run(status, finalize_tx_hash, req.params.id);
    } else {
      await db.prepare("UPDATE elections SET status = ? WHERE id = ?").run(status, req.params.id);
    }
    res.json({ success: true, message: "Status updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// DELETE /api/elections/:id
async function deleteElection(req, res) {
  try {
    const db = getDb();
    const election = await db.prepare("SELECT * FROM elections WHERE id = ?").get(req.params.id);
    if (!election) return res.status(404).json({ success: false, message: "Election not found" });
    if (election.status !== "pending")
      return res.status(400).json({ success: false, message: "Can only delete pending elections" });

    await db.prepare("DELETE FROM elections WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: "Election deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// POST /api/elections/:id/candidates
async function addCandidate(req, res) {
  try {
    const { on_chain_id, name, description, image_url, tx_hash } = req.body;
    if (!on_chain_id || !name)
      return res.status(400).json({ success: false, message: "on_chain_id and name required" });

    const db = getDb();
    const result = await db.prepare(`
      INSERT INTO candidates (election_id, on_chain_id, name, description, image_url, tx_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.id, on_chain_id, name, description || "", image_url || null, tx_hash || null);

    const candidate = await db.prepare("SELECT * FROM candidates WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json({ success: true, message: "Candidate added", candidate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// GET /api/elections/stats
async function getStats(req, res) {
  try {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    const total = await db.prepare("SELECT COUNT(*) as count FROM elections").get();
    
    // Active elections: not finalized AND current time is within [start, end)
    const active = await db.prepare(`
      SELECT COUNT(*) as count FROM elections 
      WHERE status != 'finalized' 
      AND start_time <= ? AND end_time > ?
    `).get(now, now);

    // Total voters: users with role 'voter'
    const totalVoters = await db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'voter'").get();
    const totalVotes = await db.prepare("SELECT COUNT(*) as count FROM vote_receipts").get();
    const totalUsers = await db.prepare("SELECT COUNT(*) as count FROM users").get();

    res.json({
      success: true,
      stats: {
        totalElections: total.count,
        activeElections: active.count,
        totalVoters: totalVoters.count,
        totalVotes: totalVotes.count,
        totalUsers: totalUsers.count,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}


module.exports = { getAllElections, getElectionById, createElection, updateElectionStatus, deleteElection, addCandidate, getStats };
