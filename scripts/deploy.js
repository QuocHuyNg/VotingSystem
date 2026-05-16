const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying Voting contract to Sepolia...\n");

  const [deployer] = await ethers.getSigners();
  console.log(`📋 Deployer address : ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance          : ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.error("❌ Deployer has 0 ETH. Get Sepolia ETH from https://sepoliafaucet.com");
    process.exit(1);
  }

  // Deploy contract
  const Voting = await ethers.getContractFactory("Voting");
  console.log("\n⏳ Deploying...");
  const voting = await Voting.deploy();
  await voting.waitForDeployment();

  const contractAddress = await voting.getAddress();
  console.log(`✅ Voting contract deployed at: ${contractAddress}`);

  // Detect network info dynamically
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const isLocal = chainId === 31337;

  const networkInfo = {
    chainId,
    name: isLocal ? "Hardhat Local" : "Sepolia Testnet",
    rpcUrl: isLocal
      ? "http://127.0.0.1:8545"
      : (process.env.SEPOLIA_URL || "https://rpc.ankr.com/eth_sepolia"),
    explorerUrl: isLocal
      ? null
      : "https://sepolia.etherscan.io",
  };

  // Load ABI from compiled artifact
  const artifactPath = path.join(__dirname, "../artifacts/contracts/Voting.sol/Voting.json");
  if (!fs.existsSync(artifactPath)) {
    console.error("❌ ABI not found. Run: npx hardhat compile");
    process.exit(1);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const contractData = {
    address: contractAddress,
    abi: artifact.abi,
    network: networkInfo,
    deployedAt: new Date().toISOString(),
  };

  // ── Write to frontend ──────────────────────────────────────
  const frontendDir = path.join(__dirname, "../frontend/src/contracts");
  fs.mkdirSync(frontendDir, { recursive: true });
  fs.writeFileSync(
    path.join(frontendDir, "Voting.json"),
    JSON.stringify(contractData, null, 2)
  );
  console.log("📁 ABI saved → frontend/src/contracts/Voting.json");

  // ── Write to backend ───────────────────────────────────────
  const backendDir = path.join(__dirname, "../backend/src/contracts");
  fs.mkdirSync(backendDir, { recursive: true });
  fs.writeFileSync(
    path.join(backendDir, "Voting.json"),
    JSON.stringify(contractData, null, 2)
  );
  console.log("📁 ABI saved → backend/src/contracts/Voting.json");

  // ── Update backend .env ────────────────────────────────────
  const envPath = path.join(__dirname, "../backend/.env");
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  if (envContent.includes("CONTRACT_ADDRESS=")) {
    envContent = envContent.replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${contractAddress}`);
  } else {
    envContent += `\nCONTRACT_ADDRESS=${contractAddress}`;
  }
  fs.writeFileSync(envPath, envContent);
  console.log(`🔑 CONTRACT_ADDRESS updated in backend/.env`);

  console.log("\n🎉 Deployment complete!");
  if (!isLocal) {
    console.log(`🔍 View on Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
