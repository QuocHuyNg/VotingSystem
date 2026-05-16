require("dotenv").config();
const app = require("./app");
const { initDb } = require("./config/initDb");

const PORT = process.env.PORT || 5000;

// Initialize database and start server
async function startServer() {
  await initDb();

  app.listen(PORT, () => {
    console.log(`\n🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`📋 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🔗 Contract: ${process.env.CONTRACT_ADDRESS || "Not deployed yet"}\n`);
  });
}

startServer();
