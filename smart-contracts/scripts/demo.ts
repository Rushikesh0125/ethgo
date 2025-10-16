import hre from "hardhat";

/**
 * Complete demo: Deploy + Interact in one session
 * Run: npx hardhat run scripts/demo.ts
 */

async function main() {
  console.log("🚀 FairStake Tickets - Complete Demo\n");

  const connection = await hre.network.connect();
  const ethers = connection.ethers;

  const [deployer, user1, user2, user3] = await ethers.getSigners();

  console.log("=" .repeat(60));
  console.log("PART 1: DEPLOYMENT");
  console.log("=".repeat(60) + "\n");

  // Deploy Mock PYUSD
  const MockPYUSD = await ethers.getContractFactory("MockPYUSD");
  const pyusd = await MockPYUSD.deploy();
  await pyusd.waitForDeployment();
  console.log("✅ MockPYUSD deployed");

  // Deploy Mock Entropy
  const MockEntropy = await ethers.getContractFactory("MockEntropy");
  const entropy = await MockEntropy.deploy();
  await entropy.waitForDeployment();
  console.log("✅ MockEntropy deployed");

  // Deploy Core Contracts
  const EventManager = await ethers.getContractFactory("EventManager");
  const eventManager = await EventManager.deploy();
  await eventManager.waitForDeployment();
  console.log("✅ EventManager deployed");

  const IdentityVerifier = await ethers.getContractFactory("IdentityVerifier");
  const identityVerifier = await IdentityVerifier.deploy();
  await identityVerifier.waitForDeployment();
  console.log("✅ IdentityVerifier deployed");

  const StakingPool = await ethers.getContractFactory("StakingPool");
  const stakingPool = await StakingPool.deploy(await pyusd.getAddress(), deployer.address);
  await stakingPool.waitForDeployment();
  console.log("✅ StakingPool deployed");

  const LotteryEngine = await ethers.getContractFactory("LotteryEngine");
  const lotteryEngine = await LotteryEngine.deploy(await entropy.getAddress(), deployer.address);
  await lotteryEngine.waitForDeployment();
  console.log("✅ LotteryEngine deployed");

  const BoundTicketNFT = await ethers.getContractFactory("BoundTicketNFT");
  const ticketNFT = await BoundTicketNFT.deploy();
  await ticketNFT.waitForDeployment();
  console.log("✅ BoundTicketNFT deployed");

  const BlindAuction = await ethers.getContractFactory("BlindAuction");
  const auction = await BlindAuction.deploy(await pyusd.getAddress(), deployer.address);
  await auction.waitForDeployment();
  console.log("✅ BlindAuction deployed");

  // Wire up contracts
  await eventManager.setStakingPoolContract(await stakingPool.getAddress());
  await eventManager.setLotteryEngineContract(await lotteryEngine.getAddress());
  await eventManager.setIdentityVerifierContract(await identityVerifier.getAddress());
  await stakingPool.setEventManager(await eventManager.getAddress());
  await stakingPool.setIdentityVerifier(await identityVerifier.getAddress());
  await stakingPool.setLotteryEngine(await lotteryEngine.getAddress());
  await lotteryEngine.setEventManager(await eventManager.getAddress());
  await lotteryEngine.setStakingPool(await stakingPool.getAddress());
  await ticketNFT.setEventManager(await eventManager.getAddress());
  await ticketNFT.setIdentityVerifier(await identityVerifier.getAddress());
  await ticketNFT.setStakingPool(await stakingPool.getAddress());
  await ticketNFT.setAuctionContract(await auction.getAddress());
  await auction.setTicketNFT(await ticketNFT.getAddress());
  await auction.setIdentityVerifier(await identityVerifier.getAddress());
  console.log("✅ Contracts wired up");

  // Setup identities
  await identityVerifier.addToWhitelist(user1.address);
  await identityVerifier.addToWhitelist(user2.address);
  await identityVerifier.addToWhitelist(user3.address);
  console.log("✅ Users whitelisted");

  // Mint PYUSD to users
  await pyusd.mint(user1.address, ethers.parseUnits("10000", 6));
  await pyusd.mint(user2.address, ethers.parseUnits("10000", 6));
  await pyusd.mint(user3.address, ethers.parseUnits("10000", 6));
  console.log("✅ PYUSD minted to users\n");

  console.log("=".repeat(60));
  console.log("PART 2: END-TO-END FLOW");
  console.log("=".repeat(60) + "\n");

  // Step 1: Create Event
  console.log("📅 Step 1: Creating Event...");
  const latestBlock = await ethers.provider.getBlock("latest");
  const now = latestBlock!.timestamp;

  await eventManager.createEvent(
    "Web3 Summit 2025",
    "ipfs://QmExampleMetadata123",
    now + 60,
    now + 600,
    now + 1200,
    250,
    3000
  );
  const eventId = 0;
  console.log("✅ Event created with ID:", eventId);

  // Step 2: Configure Pools
  console.log("\n🎟️  Step 2: Configuring Pools...");
  await eventManager.configurePool(eventId, 0, ethers.parseUnits("500", 6), 2);
  console.log("✅ Pool A: 500 PYUSD, 2 tickets");

  // Step 3: Open Registration
  console.log("\n⏰ Step 3: Opening Registration...");
  await ethers.provider.send("evm_increaseTime", [61]);
  await ethers.provider.send("evm_mine");
  await eventManager.openRegistration(eventId);
  console.log("✅ Registration opened");

  // Step 4: Users Enter Pool
  console.log("\n👥 Step 4: Users Entering Pool...");
  const facePrice = ethers.parseUnits("500", 6);
  const platformFee = (facePrice * 250n) / 10000n;
  const totalStake = facePrice + platformFee;

  await pyusd.connect(user1).approve(await stakingPool.getAddress(), totalStake);
  await stakingPool.connect(user1).enterPool(eventId, 0, "0x");
  console.log("✅ User 1 entered");

  await pyusd.connect(user2).approve(await stakingPool.getAddress(), totalStake);
  await stakingPool.connect(user2).enterPool(eventId, 0, "0x");
  console.log("✅ User 2 entered");

  await pyusd.connect(user3).approve(await stakingPool.getAddress(), totalStake);
  await stakingPool.connect(user3).enterPool(eventId, 0, "0x");
  console.log("✅ User 3 entered (will be loser)");

  // Step 5: Close Registration
  console.log("\n🔒 Step 5: Closing Registration...");
  await ethers.provider.send("evm_increaseTime", [600]);
  await ethers.provider.send("evm_mine");
  await eventManager.closeRegistration(eventId);
  console.log("✅ Registration closed");

  // Step 6: Run Lottery
  console.log("\n🎲 Step 6: Running Lottery...");
  const drawFee = await lotteryEngine.getDrawFee();
  await lotteryEngine.requestDraw(eventId, 0, { value: drawFee });
  console.log("✅ VRF requested");

  await lotteryEngine.revealAndSelectWinners(eventId, 0);
  console.log("✅ Winners selected");

  await lotteryEngine.completeEventDraw(eventId);
  console.log("✅ Draw completed");

  // Step 7: Check Results
  console.log("\n📊 Step 7: Results...");
  const winners = await lotteryEngine.getWinners(eventId, 0);
  console.log("🏆 Winners:", winners);

  const isUser1Winner = await stakingPool.isWinner(eventId, user1.address);
  const isUser2Winner = await stakingPool.isWinner(eventId, user2.address);
  const isUser3Winner = await stakingPool.isWinner(eventId, user3.address);

  console.log("   User 1:", isUser1Winner ? "✅ WINNER" : "❌ Loser");
  console.log("   User 2:", isUser2Winner ? "✅ WINNER" : "❌ Loser");
  console.log("   User 3:", isUser3Winner ? "✅ WINNER" : "❌ Loser");

  // Step 8: Mint Tickets & Refunds
  console.log("\n🎫 Step 8: Minting Tickets and Processing Refunds...");

  for (const winner of winners) {
    await ticketNFT.mintTicket(winner, eventId, 0, "ipfs://QmEncryptedTicket");
    const tokenId = await ticketNFT.getUserTicket(eventId, winner);
    console.log(`✅ Ticket NFT #${tokenId} minted to ${winner}`);
  }

  const allUsers = [user1, user2, user3];
  for (let i = 0; i < allUsers.length; i++) {
    const user = allUsers[i];
    const userStakes = await stakingPool.getUserStakes(user.address);
    if (userStakes.length > 0) {
      const stake = await stakingPool.getStake(userStakes[0]);
      if (!stake.isWinner) {
        const balanceBefore = await pyusd.balanceOf(user.address);
        await stakingPool.connect(user).claimRefund(userStakes[0]);
        const balanceAfter = await pyusd.balanceOf(user.address);
        const refund = balanceAfter - balanceBefore;
        console.log(`💰 User ${i + 1} refunded: ${ethers.formatUnits(refund, 6)} PYUSD`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✨ DEMO COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📝 Summary:");
  console.log("   - Event created with Pool A (2 tickets)");
  console.log("   - 3 users entered pool");
  console.log("   - Lottery run with Pyth Entropy VRF");
  console.log("   - 2 winners received ticket NFTs");
  console.log("   - 1 loser received refund + rebate\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
