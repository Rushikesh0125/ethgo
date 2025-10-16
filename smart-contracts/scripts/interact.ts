import hre from "hardhat";
import fs from "fs";

/**
 * Example script demonstrating end-to-end flow
 * Run: npx hardhat run scripts/interact.ts
 */

async function main() {
  console.log("🎫 FairStake Tickets - Interaction Example\n");

  const connection = await hre.network.connect();
  const ethers = connection.ethers;

  // Load deployment addresses
  const deploymentData = JSON.parse(fs.readFileSync("deployment-addresses.json", "utf8"));
  const contracts = deploymentData.contracts;

  // Get signers
  const [owner, user1, user2, user3] = await ethers.getSigners();

  console.log("📋 Using deployed contracts:");
  console.log("   EventManager:", contracts.EventManager);
  console.log("   StakingPool:", contracts.StakingPool);
  console.log("   PYUSD:", contracts.MockPYUSD);
  console.log("\n");

  // Get contract instances
  const eventManager = await ethers.getContractAt("EventManager", contracts.EventManager);
  const stakingPool = await ethers.getContractAt("StakingPool", contracts.StakingPool);
  const lotteryEngine = await ethers.getContractAt("LotteryEngine", contracts.LotteryEngine);
  const ticketNFT = await ethers.getContractAt("BoundTicketNFT", contracts.BoundTicketNFT);
  const pyusd = await ethers.getContractAt("MockPYUSD", contracts.MockPYUSD);
  const identityVerifier = await ethers.getContractAt("IdentityVerifier", contracts.IdentityVerifier);

  // ============ Step 1: Create Event ============
  console.log("📅 Step 1: Creating Event...");
  
  const now = Math.floor(Date.now() / 1000);
  const registrationStart = now + 60; // Start in 1 minute
  const registrationEnd = now + 600; // End in 10 minutes
  const claimDeadline = now + 1200; // Claim in 20 minutes

  const tx1 = await eventManager.createEvent(
    "Web3 Summit 2025",
    "ipfs://QmExampleMetadata123",
    registrationStart,
    registrationEnd,
    claimDeadline,
    250, // 2.5% platform fee
    3000 // 30% rebate alpha
  );
  await tx1.wait();

  const eventId = 0;
  console.log("✅ Event created with ID:", eventId);

  // ============ Step 2: Configure Pools ============
  console.log("\n🎟️  Step 2: Configuring Ticket Pools...");

  // Pool A - 500 PYUSD, 2 tickets
  const tx2 = await eventManager.configurePool(
    eventId,
    0, // PoolClass.A
    ethers.parseUnits("500", 6),
    2
  );
  await tx2.wait();
  console.log("✅ Pool A configured: 500 PYUSD, 2 tickets");

  // Pool B - 1000 PYUSD, 1 ticket
  const tx3 = await eventManager.configurePool(
    eventId,
    1, // PoolClass.B
    ethers.parseUnits("1000", 6),
    1
  );
  await tx3.wait();
  console.log("✅ Pool B configured: 1000 PYUSD, 1 ticket");

  // ============ Step 3: Wait and Open Registration ============
  console.log("\n⏰ Step 3: Waiting for registration start...");
  console.log("   (In real scenario, wait until registrationStart)");
  
  // For demo, just increase time
  await ethers.provider.send("evm_increaseTime", [61]);
  await ethers.provider.send("evm_mine");

  const tx4 = await eventManager.openRegistration(eventId);
  await tx4.wait();
  console.log("✅ Registration opened!");

  // ============ Step 4: Users Enter Pools ============
  console.log("\n👥 Step 4: Users Entering Pools...");

  // Setup: Add users to whitelist
  await identityVerifier.addToWhitelist(user1.address);
  await identityVerifier.addToWhitelist(user2.address);
  await identityVerifier.addToWhitelist(user3.address);

  // Mint PYUSD to users
  await pyusd.mint(user1.address, ethers.parseUnits("10000", 6));
  await pyusd.mint(user2.address, ethers.parseUnits("10000", 6));
  await pyusd.mint(user3.address, ethers.parseUnits("10000", 6));

  // User 1 enters Pool A
  const facePrice = ethers.parseUnits("500", 6);
  const platformFee = (facePrice * 250n) / 10000n;
  const totalStake = facePrice + platformFee;

  await pyusd.connect(user1).approve(contracts.StakingPool, totalStake);
  await stakingPool.connect(user1).enterPool(eventId, 0, "0x");
  console.log("✅ User 1 entered Pool A");

  // User 2 enters Pool A
  await pyusd.connect(user2).approve(contracts.StakingPool, totalStake);
  await stakingPool.connect(user2).enterPool(eventId, 0, "0x");
  console.log("✅ User 2 entered Pool A");

  // User 3 enters Pool A (will be loser since only 2 tickets)
  await pyusd.connect(user3).approve(contracts.StakingPool, totalStake);
  await stakingPool.connect(user3).enterPool(eventId, 0, "0x");
  console.log("✅ User 3 entered Pool A");

  // ============ Step 5: Close Registration ============
  console.log("\n🔒 Step 5: Closing Registration...");

  await ethers.provider.send("evm_increaseTime", [600]);
  await ethers.provider.send("evm_mine");

  await eventManager.closeRegistration(eventId);
  console.log("✅ Registration closed");

  // ============ Step 6: Run Lottery ============
  console.log("\n🎲 Step 6: Running Lottery Draw...");

  const drawFee = await lotteryEngine.getDrawFee();
  
  // Request draw
  const tx5 = await lotteryEngine.requestDraw(eventId, 0, { value: drawFee });
  await tx5.wait();
  console.log("✅ VRF requested");

  // Reveal and select winners
  const tx6 = await lotteryEngine.revealAndSelectWinners(eventId, 0);
  await tx6.wait();
  console.log("✅ Winners selected");

  // Complete draw
  const tx7 = await lotteryEngine.completeEventDraw(eventId);
  await tx7.wait();
  console.log("✅ Draw completed");

  // ============ Step 7: Check Results ============
  console.log("\n📊 Step 7: Checking Results...");

  const winners = await lotteryEngine.getWinners(eventId, 0);
  console.log("🏆 Winners:", winners);

  const isUser1Winner = await stakingPool.isWinner(eventId, user1.address);
  const isUser2Winner = await stakingPool.isWinner(eventId, user2.address);
  const isUser3Winner = await stakingPool.isWinner(eventId, user3.address);

  console.log("   User 1:", isUser1Winner ? "✅ WINNER" : "❌ Loser");
  console.log("   User 2:", isUser2Winner ? "✅ WINNER" : "❌ Loser");
  console.log("   User 3:", isUser3Winner ? "✅ WINNER" : "❌ Loser");

  // ============ Step 8: Claim Tickets/Refunds ============
  console.log("\n🎫 Step 8: Claiming Tickets and Refunds...");

  // Mint tickets for winners
  for (let i = 0; i < winners.length; i++) {
    const winner = winners[i];
    await ticketNFT.mintTicket(
      winner,
      eventId,
      0, // Pool A
      "ipfs://QmEncryptedTicket"
    );
    const tokenId = await ticketNFT.getUserTicket(eventId, winner);
    console.log(`✅ Ticket NFT #${tokenId} minted to ${winner}`);
  }

  // Losers claim refunds
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
        console.log(`💰 User ${i + 1} received refund: ${ethers.formatUnits(refund, 6)} PYUSD`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✨ Demo Complete!");
  console.log("=".repeat(60));
  console.log("\n📝 Summary:");
  console.log("   - Event created with 2 pools");
  console.log("   - 3 users entered Pool A (2 tickets available)");
  console.log("   - Lottery run with Pyth Entropy VRF");
  console.log("   - 2 winners received ticket NFTs");
  console.log("   - 1 loser received refund + rebate");
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });