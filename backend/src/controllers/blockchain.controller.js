const { ethers } = require("ethers");

let provider = null;

/**
 * Lấy provider kết nối tới Sepolia testnet
 * Dùng SEPOLIA_URL từ .env, fallback về public RPC
 */
function getProvider() {
  if (!provider) {
    const rpcUrl = process.env.SEPOLIA_URL || "https://rpc.ankr.com/eth_sepolia";
    provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  return provider;
}

// GET /api/blockchain/info
async function getInfo(req, res) {
  try {
    const p = getProvider();
    const network = await p.getNetwork();
    const blockNumber = await p.getBlockNumber();
    res.json({
      success: true,
      info: {
        chainId: network.chainId.toString(),
        name: "Sepolia Testnet",
        blockNumber,
        contractAddress: process.env.CONTRACT_ADDRESS || null,
        explorerUrl: process.env.ETHERSCAN_BASE_URL || "https://sepolia.etherscan.io",
      }
    });
  } catch (err) {
    console.error("[blockchain] getInfo error:", err.message);
    res.status(503).json({ success: false, message: "Cannot connect to Sepolia network" });
  }
}

// GET /api/blockchain/blocks?limit=10
async function getRecentBlocks(req, res) {
  try {
    const p = getProvider();
    const limit = Math.min(parseInt(req.query.limit) || 10, 20);
    const latestBlockNum = await p.getBlockNumber();

    const blockPromises = [];
    for (let i = 0; i < limit && latestBlockNum - i >= 0; i++) {
      blockPromises.push(p.getBlock(latestBlockNum - i));
    }
    const rawBlocks = await Promise.all(blockPromises);

    const blocks = rawBlocks
      .filter(Boolean)
      .map((block) => ({
        number: block.number,
        hash: block.hash,
        parentHash: block.parentHash,
        timestamp: block.timestamp,
        transactionCount: block.transactions.length,
        gasUsed: block.gasUsed?.toString(),
        gasLimit: block.gasLimit?.toString(),
        miner: block.miner,
      }));

    res.json({ success: true, blocks });
  } catch (err) {
    console.error("[blockchain] getRecentBlocks error:", err.message);
    res.status(503).json({ success: false, message: "Cannot connect to Sepolia network" });
  }
}

// GET /api/blockchain/tx/:hash
async function getTransaction(req, res) {
  try {
    const p = getProvider();
    const tx = await p.getTransaction(req.params.hash);
    if (!tx)
      return res.status(404).json({ success: false, message: "Transaction not found on Sepolia" });

    const receipt = await p.getTransactionReceipt(req.params.hash);
    res.json({
      success: true,
      transaction: {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        gasPrice: tx.gasPrice?.toString(),
        blockNumber: tx.blockNumber,
        blockHash: tx.blockHash,
        nonce: tx.nonce,
        status: receipt?.status === 1 ? "success" : "failed",
        gasUsed: receipt?.gasUsed?.toString(),
        explorerUrl: `${process.env.ETHERSCAN_BASE_URL || "https://sepolia.etherscan.io"}/tx/${tx.hash}`,
      }
    });
  } catch (err) {
    console.error("[blockchain] getTransaction error:", err.message);
    res.status(503).json({ success: false, message: "Cannot connect to Sepolia network" });
  }
}

// GET /api/blockchain/activity
async function getSystemActivity(req, res) {
  try {
    const db = require("../config/db").getDb();
    const limit = 20;

    // Combined query for all system activities
    const activity = await db.prepare(`
      SELECT 'election' as type, id, name, tx_hash, created_at as timestamp, 'Tạo cuộc bầu cử mới' as details
      FROM elections
      UNION ALL
      SELECT 'candidate' as type, election_id as id, name, tx_hash, added_at as timestamp, (SELECT name FROM elections WHERE id = election_id) as details
      FROM candidates WHERE tx_hash IS NOT NULL
      UNION ALL
      SELECT 'vote' as type, election_id as id, (SELECT name FROM elections WHERE id = election_id) as name, tx_hash, voted_at as timestamp, 'Người bầu: ' || voter_wallet as details
      FROM vote_receipts
      UNION ALL
      SELECT 'finalize' as type, id, name, finalize_tx_hash as tx_hash, created_at as timestamp, 'Tổng kết kết quả bầu cử' as details
      FROM elections WHERE status = 'finalized' AND finalize_tx_hash IS NOT NULL
      UNION ALL
      SELECT 'authorize' as type, election_id as id, (SELECT name FROM elections WHERE id = election_id) as name, tx_hash, authorized_at as timestamp, 'Ủy quyền: ' || wallet_address as details
      FROM authorized_voters WHERE tx_hash IS NOT NULL
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit);

    res.json({ success: true, activity });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { getInfo, getRecentBlocks, getTransaction, getSystemActivity };
