require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./routes/auth.routes");
const electionRoutes = require("./routes/election.routes");
const userRoutes = require("./routes/user.routes");
const voteRoutes = require("./routes/vote.routes");
const blockchainRoutes = require("./routes/blockchain.routes");
const errorMiddleware = require("./middlewares/error.middleware");

const app = express();

// ── CORS ──────────────────────────────────────────────────────
// Cho phép frontend localhost ở bất kỳ port nào
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Cho phép requests không có origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Dev mode: cho phép tất cả localhost
    if (process.env.NODE_ENV === "development" && origin.startsWith("http://localhost")) {
      return callback(null, true);
    }
    callback(new Error("CORS: Origin not allowed"));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ── Health Check ──────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    network: "Sepolia Testnet",
    contractAddress: process.env.CONTRACT_ADDRESS || "Not deployed yet",
  });
});

// ── Routes ────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/elections", electionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/votes", voteRoutes);
app.use("/api/blockchain", blockchainRoutes);

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Error Handler ─────────────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;
