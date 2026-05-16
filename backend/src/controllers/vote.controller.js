const { getDb } = require("../config/db");

// POST /api/votes/record — save tx after on-chain vote
async function recordVote(req, res) {
  try {
    const { election_id, voter_wallet, tx_hash, vote_hash, block_number } = req.body;
    if (!election_id || !voter_wallet || !tx_hash)
      return res.status(400).json({ success: false, message: "election_id, voter_wallet, tx_hash required" });

    const db = getDb();
    const existing = await db.prepare("SELECT id FROM vote_receipts WHERE tx_hash = ?").get(tx_hash);
    if (existing)
      return res.status(409).json({ success: false, message: "Transaction already recorded" });

    await db.prepare(`
      INSERT INTO vote_receipts (election_id, voter_wallet, tx_hash, vote_hash, block_number)
      VALUES (?, ?, ?, ?, ?)
    `).run(election_id, voter_wallet.toLowerCase(), tx_hash, vote_hash || null, block_number || null);

    res.status(201).json({ success: true, message: "Vote recorded successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// GET /api/votes/status/:electionId?wallet=0x...
async function getVoteStatus(req, res) {
  try {
    const { wallet } = req.query;
    if (!wallet)
      return res.status(400).json({ success: false, message: "wallet query param required" });

    const db = getDb();
    const receipt = await db.prepare(
      "SELECT * FROM vote_receipts WHERE election_id = ? AND LOWER(voter_wallet) = LOWER(?)"
    ).get(req.params.electionId, wallet);

    res.json({
      success: true,
      hasVoted: !!receipt,
      receipt: receipt || null
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// GET /api/votes/verify/:txHash
async function verifyVote(req, res) {
  try {
    const db = getDb();
    const hash = req.params.txHash;

    // 1. Check if it's a vote
    const voteReceipt = await db.prepare(`
      SELECT vr.*, e.name as election_name
      FROM vote_receipts vr
      LEFT JOIN elections e ON vr.election_id = e.id
      WHERE vr.tx_hash = ?
    `).get(hash);

    if (voteReceipt) {
      return res.json({
        success: true,
        type: 'vote',
        valid: true,
        receipt: {
          txHash: voteReceipt.tx_hash,
          voteHash: voteReceipt.vote_hash,
          electionId: voteReceipt.election_id,
          electionName: voteReceipt.election_name,
          blockNumber: voteReceipt.block_number,
          votedAt: voteReceipt.voted_at,
          details: `Cử tri ${voteReceipt.voter_wallet} đã bỏ phiếu`
        }
      });
    }

    // 2. Check if it's an election creation
    const election = await db.prepare(`
      SELECT e.*, u.username as creator_name
      FROM elections e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.tx_hash = ?
    `).get(hash);

    if (election) {
      return res.json({
        success: true,
        type: 'election_created',
        valid: true,
        receipt: {
          txHash: election.tx_hash,
          electionId: election.id,
          electionName: election.name,
          votedAt: election.created_at,
          details: `Admin ${election.creator_name || 'Hệ thống'} đã tạo cuộc bầu cử này`
        }
      });
    }

    return res.status(404).json({ success: false, message: "Không tìm thấy giao dịch liên quan đến hệ thống", valid: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// GET /api/votes/results/:electionId — from DB cache
async function getResults(req, res) {
  try {
    const db = getDb();
    const candidates = await db.prepare("SELECT * FROM candidates WHERE election_id = ? ORDER BY on_chain_id").all(req.params.electionId);
    const voteCount = await db.prepare("SELECT COUNT(*) as count FROM vote_receipts WHERE election_id = ?").get(req.params.electionId);
    res.json({ success: true, candidates, totalVotes: voteCount.count });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// GET /api/votes/my-receipts — lịch sử bỏ phiếu của user hiện tại
async function getMyReceipts(req, res) {
  try {
    const db = getDb();
    // Lấy wallet_address từ user đang đăng nhập
    const user = await db.prepare("SELECT wallet_address FROM users WHERE id = ?").get(req.user.id);
    if (!user?.wallet_address)
      return res.json({ success: true, receipts: [] });

    const receipts = await db.prepare(`
      SELECT vr.*, e.name as election_name
      FROM vote_receipts vr
      LEFT JOIN elections e ON vr.election_id = e.id
      WHERE LOWER(vr.voter_wallet) = LOWER(?)
      ORDER BY vr.voted_at DESC
    `).all(user.wallet_address);

    res.json({ success: true, receipts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { recordVote, getVoteStatus, verifyVote, getResults, getMyReceipts };
