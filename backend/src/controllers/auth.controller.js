const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { getDb } = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { username, email, password, wallet_address } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ success: false, message: "Missing required fields" });

    const db = getDb();
    const existing = await db.prepare("SELECT id FROM users WHERE email = ? OR username = ?").get(email, username);
    if (existing)
      return res.status(409).json({ success: false, message: "Email or username already exists" });

    const hash = bcrypt.hashSync(password, 10);
    const result = await db.prepare(
      "INSERT INTO users (username, email, password_hash, wallet_address) VALUES (?, ?, ?, ?)"
    ).run(username, email, hash, wallet_address || null);

    const user = await db.prepare("SELECT id, username, email, role, wallet_address, created_at FROM users WHERE id = ?").get(result.lastInsertRowid);
    const token = generateToken(user);

    res.status(201).json({ success: true, message: "Registered successfully", token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email/Username and password required" });

    const db = getDb();
    const user = await db.prepare("SELECT * FROM users WHERE email = ? OR username = ?").get(email, email);
    
    if (!user)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    if (user.is_active === 0)
      return res.status(403).json({ success: false, message: "Account is disabled" });

    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = generateToken(user);
    const { password_hash, ...safeUser } = user;
    res.json({ success: true, message: "Login successful", token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  try {
    const db = getDb();
    const user = await db.prepare("SELECT id, username, email, role, wallet_address, created_at FROM users WHERE id = ?").get(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// PUT /api/auth/wallet
async function updateWallet(req, res) {
  try {
    const { wallet_address } = req.body;
    if (!wallet_address)
      return res.status(400).json({ success: false, message: "Wallet address required" });

    const db = getDb();
    const existing = await db.prepare("SELECT id FROM users WHERE wallet_address = ? AND id != ?").get(wallet_address, req.user.id);
    if (existing)
      return res.status(409).json({ success: false, message: "Wallet address already used by another account" });

    await db.prepare("UPDATE users SET wallet_address = ? WHERE id = ?").run(wallet_address, req.user.id);
    const user = await db.prepare("SELECT id, username, email, role, wallet_address FROM users WHERE id = ?").get(req.user.id);
    res.json({ success: true, message: "Wallet address updated", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { register, login, getMe, updateWallet };
