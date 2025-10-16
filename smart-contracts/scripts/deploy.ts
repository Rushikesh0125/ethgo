import hre from "hardhat";
import fs from "fs";

async function main() {
  try {
    console.log("🚀 Starting FairStake Tickets deployment...\n");

    const connection = await hre.network.connect();
    const ethers = connection.ethers;

    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // ============ Deploy Mock Contracts ============
    console.log("📦 Deploying Mock Contracts...");

    // Deploy Mock PYUSD
    const MockPYUSD = await ethers.getContractFactory("MockPYUSD");
    const pyusd = await MockPYUSD.deploy();
    await pyusd.waitForDeployment();
    console.log("✅ MockPYUSD deployed to:", await pyusd.getAddress());

    // Deploy Mock Entropy (Pyth VRF)
    const MockEntropy = await ethers.getContractFactory("MockEntropy");
    const entropy = await MockEntropy.deploy();
    await entropy.waitForDeployment();
    console.log("✅ MockEntropy deployed to:", await entropy.getAddress());

    const entropyProvider = deployer.address; // Use deployer as entropy provider for testing

    // ============ Deploy Core Contracts ============
    console.log("\n📦 Deploying Core Contracts...");

    // 1. EventManager
    const EventManager = await ethers.getContractFactory("EventManager");
    const eventManager = await EventManager.deploy();
    await eventManager.waitForDeployment();
    console.log("✅ EventManager deployed to:", await eventManager.getAddress());

    // 2. IdentityVerifier
    const IdentityVerifier = await ethers.getContractFactory("IdentityVerifier");
    const identityVerifier = await IdentityVerifier.deploy();
    await identityVerifier.waitForDeployment();
    console.log("✅ IdentityVerifier deployed to:", await identityVerifier.getAddress());

    // 3. StakingPool
    const StakingPool = await ethers.getContractFactory("StakingPool");
    const stakingPool = await StakingPool.deploy(
      await pyusd.getAddress(),
      deployer.address // treasury
    );
    await stakingPool.waitForDeployment();
    console.log("✅ StakingPool deployed to:", await stakingPool.getAddress());

    // 4. LotteryEngine
    const LotteryEngine = await ethers.getContractFactory("LotteryEngine");
    const lotteryEngine = await LotteryEngine.deploy(
      await entropy.getAddress(),
      entropyProvider
    );
    await lotteryEngine.waitForDeployment();
    console.log("✅ LotteryEngine deployed to:", await lotteryEngine.getAddress());

    // 5. BoundTicketNFT
    const BoundTicketNFT = await ethers.getContractFactory("BoundTicketNFT");
    const ticketNFT = await BoundTicketNFT.deploy();
    await ticketNFT.waitForDeployment();
    console.log("✅ BoundTicketNFT deployed to:", await ticketNFT.getAddress());

    // 6. BlindAuction
    const BlindAuction = await ethers.getContractFactory("BlindAuction");
    const auction = await BlindAuction.deploy(
      await pyusd.getAddress(),
      deployer.address // treasury
    );
    await auction.waitForDeployment();
    console.log("✅ BlindAuction deployed to:", await auction.getAddress());

    // ============ Wire Up Contracts ============
    console.log("\n🔗 Connecting Contracts...");

    // EventManager connections
    await eventManager.setStakingPoolContract(await stakingPool.getAddress());
    console.log("✅ EventManager → StakingPool");

    await eventManager.setLotteryEngineContract(await lotteryEngine.getAddress());
    console.log("✅ EventManager → LotteryEngine");

    await eventManager.setIdentityVerifierContract(await identityVerifier.getAddress());
    console.log("✅ EventManager → IdentityVerifier");

    // StakingPool connections
    await stakingPool.setEventManager(await eventManager.getAddress());
    console.log("✅ StakingPool → EventManager");

    await stakingPool.setIdentityVerifier(await identityVerifier.getAddress());
    console.log("✅ StakingPool → IdentityVerifier");

    await stakingPool.setLotteryEngine(await lotteryEngine.getAddress());
    console.log("✅ StakingPool → LotteryEngine");

    // LotteryEngine connections
    await lotteryEngine.setEventManager(await eventManager.getAddress());
    console.log("✅ LotteryEngine → EventManager");

    await lotteryEngine.setStakingPool(await stakingPool.getAddress());
    console.log("✅ LotteryEngine → StakingPool");

    // TicketNFT connections
    await ticketNFT.setEventManager(await eventManager.getAddress());
    console.log("✅ TicketNFT → EventManager");

    await ticketNFT.setIdentityVerifier(await identityVerifier.getAddress());
    console.log("✅ TicketNFT → IdentityVerifier");

    await ticketNFT.setStakingPool(await stakingPool.getAddress());
    console.log("✅ TicketNFT → StakingPool");

    await ticketNFT.setAuctionContract(await auction.getAddress());
    console.log("✅ TicketNFT → Auction");

    // Auction connections
    await auction.setTicketNFT(await ticketNFT.getAddress());
    console.log("✅ Auction → TicketNFT");

    await auction.setIdentityVerifier(await identityVerifier.getAddress());
    console.log("✅ Auction → IdentityVerifier");

    // ============ Initial Setup ============
    console.log("\n⚙️  Initial Setup...");

    // Add deployer to whitelist for testing
    await identityVerifier.addToWhitelist(deployer.address);
    console.log("✅ Added deployer to whitelist");

    // Mint some PYUSD for testing
    await pyusd.mint(deployer.address, ethers.parseUnits("100000", 6)); // 100k PYUSD
    console.log("✅ Minted 100k PYUSD to deployer");

    // ============ Deployment Summary ============
    console.log("\n" + "=".repeat(60));
    console.log("📋 DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log("\n🪙  Mock Tokens:");
    console.log("   PYUSD:         ", await pyusd.getAddress());
    console.log("   Entropy:       ", await entropy.getAddress());

    console.log("\n🏗️  Core Contracts:");
    console.log("   EventManager:  ", await eventManager.getAddress());
    console.log("   StakingPool:   ", await stakingPool.getAddress());
    console.log("   LotteryEngine: ", await lotteryEngine.getAddress());
    console.log("   IdentityVerifier:", await identityVerifier.getAddress());

    console.log("\n🎫  NFT & Marketplace:");
    console.log("   TicketNFT:     ", await ticketNFT.getAddress());
    console.log("   BlindAuction:  ", await auction.getAddress());

    console.log("\n👤  Admin:");
    console.log("   Deployer:      ", deployer.address);
    console.log("   Treasury:      ", deployer.address);

    console.log("\n" + "=".repeat(60));
    console.log("✨ Deployment Complete!");
    console.log("=".repeat(60) + "\n");

    // Save deployment addresses to file
    const deploymentData = {
      network: hre.network.name,
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: {
        MockPYUSD: await pyusd.getAddress(),
        MockEntropy: await entropy.getAddress(),
        EventManager: await eventManager.getAddress(),
        StakingPool: await stakingPool.getAddress(),
        LotteryEngine: await lotteryEngine.getAddress(),
        IdentityVerifier: await identityVerifier.getAddress(),
        BoundTicketNFT: await ticketNFT.getAddress(),
        BlindAuction: await auction.getAddress(),
      },
    };

    fs.writeFileSync(
      "deployment-addresses.json",
      JSON.stringify(deploymentData, null, 2)
    );
    console.log("📝 Deployment addresses saved to deployment-addresses.json\n");

    // Verification command hints
    console.log("📌 To verify contracts on Etherscan, run:");
    console.log(`npx hardhat verify --network ${hre.network.name} ${await eventManager.getAddress()}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${await stakingPool.getAddress()} ${await pyusd.getAddress()} ${deployer.address}`);
    console.log("... (and so on for other contracts)\n");

    return {
      pyusd,
      entropy,
      eventManager,
      stakingPool,
      lotteryEngine,
      identityVerifier,
      ticketNFT,
      auction,
    };
  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
