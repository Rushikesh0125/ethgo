const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("Starting Refund and Rewards Claim Script...\n");

  const [user] = await ethers.getSigners();
  console.log("Claiming as user:", user.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(user.address)), "ETH\n");

  const ROUTER_ADDRESS = "0x735356F9cf30c239d00E5B7F667dB7D52fe784A3"; 
  const PYUSD_ADDRESS = "0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1"; 
  const EVENT_ID = 0;          
  const TIER_ID = 1;              

  console.log("Getting contract instances...");
  const router = await ethers.getContractAt("EventRouter", ROUTER_ADDRESS);
  const pyusd = await ethers.getContractAt("IERC20", PYUSD_ADDRESS);

  const eventAddress = await router.eventAddresses(EVENT_ID);
  if (eventAddress === ethers.ZeroAddress) {
    throw new Error(`Event ID ${EVENT_ID} not found`);
  }
  console.log("Event Address:", eventAddress);

  const event = await ethers.getContractAt("IEvent", eventAddress);


  console.log("\nChecking event status and eligibility...");
  
  // Get event basic info
  const eventInfo = await event.getEventInfo();
  const currentTime = Math.floor(Date.now() / 1000);
  
  console.log("\nEvent Information:");
  console.log("- Name:", eventInfo.name);
  console.log("- Sale Start:", new Date(Number(eventInfo.saleStartTime) * 1000).toISOString());
  console.log("- Sale End:", new Date(Number(eventInfo.saleEndTime) * 1000).toISOString());
  console.log("- Reveal Time:", new Date(Number(eventInfo.revealTime) * 1000).toISOString());
  console.log("- Current Time:", new Date(currentTime * 1000).toISOString());

  if (currentTime < Number(eventInfo.revealTime)) {
    throw new Error(`Reveal has not happened yet. Reveal time: ${new Date(Number(eventInfo.revealTime) * 1000).toISOString()}`);
  }

  const userBooking = await event.userBookingsByTier(user.address, TIER_ID);
  console.log("\nUser Booking Status:");
  console.log("- Has Premium Booking:", userBooking.premiumIndex > 0);
  console.log("- Has Gen Booking:", userBooking.genIndex > 0);
  console.log("- Has Claimed:", userBooking.hasClaimed);

  if (userBooking.premiumIndex === 0 && userBooking.genIndex === 0) {
    throw new Error(`No booking found for user ${user.address} in tier ${TIER_ID}`);
  }

  if (userBooking.hasClaimed) {
    throw new Error("User has already claimed for this tier");
  }

  console.log("\nChecking if user is a winner...");
  
  let isWinner = false;

  // Check premium slot
  if (userBooking.premiumIndex > 0) {
    const isPremiumWinner = await event.isWinner(TIER_ID, 0, user.address);
    console.log("- Premium Winner:", isPremiumWinner);
    if (isPremiumWinner) {
      isWinner = true;
    }
  }

  // Check gen slot
  if (userBooking.genIndex > 0) {
    const isGenWinner = await event.isWinner(TIER_ID, 1, user.address);
    console.log("- Gen Winner:", isGenWinner);
    if (isGenWinner) {
      isWinner = true;
    }
  }

  if (isWinner) {
    throw new Error(`User ${user.address} is a winner for tier ${TIER_ID}. Use claimTicket script instead.`);
  }

  console.log("User is not a winner - eligible for refund and rewards");

  console.log("\nCalculating refund amount...");
  const tierData = await event.getTierData(TIER_ID);
  const premiumPrice = await event.getTicketPrice(TIER_ID, 0);
  const genPrice = await event.getTicketPrice(TIER_ID, 1);
  
  let totalRefund = BigInt(0);
  
  if (userBooking.premiumIndex > 0) {
    totalRefund += premiumPrice;
    console.log("- Premium booking refund:", ethers.formatUnits(premiumPrice, 6), "PYUSD");
  }
  
  if (userBooking.genIndex > 0) {
    totalRefund += genPrice;
    console.log("- Gen booking refund:", ethers.formatUnits(genPrice, 6), "PYUSD");
  }

  console.log("- Total refund:", ethers.formatUnits(totalRefund, 6), "PYUSD");

  console.log("\nGetting rewards information...");
  const bookingMetric = await event.getBookingMetric(TIER_ID);
  
  console.log("Tier Booking Metrics:");
  console.log("- Total Bookings:", bookingMetric.totalBookings.toString());
  console.log("- Premium Bookings:", bookingMetric.totalPremiumBookings.toString());
  console.log("- Gen Bookings:", bookingMetric.totalGenBookings.toString());
  console.log("- Surplus Collected:", ethers.formatUnits(bookingMetric.surplusCollected, 6), "PYUSD");

  // Calculate potential reward
  let rewardAmount = BigInt(0);
  if (bookingMetric.surplusCollected > 0) {
    // This is an approximation - the actual calculation happens in the contract
    const totalEligibleUsers = await event._countEligibleUsers(TIER_ID);
    if (totalEligibleUsers > 0) {
      rewardAmount = bookingMetric.surplusCollected / BigInt(totalEligibleUsers);
    }
    console.log("- Estimated reward per user:", ethers.formatUnits(rewardAmount, 6), "PYUSD");
    console.log("- Total eligible users:", totalEligibleUsers.toString());
  } else {
    console.log("- No surplus collected - no rewards available");
  }

  const totalAmount = totalRefund + rewardAmount;
  console.log("- Total amount to receive:", ethers.formatUnits(totalAmount, 6), "PYUSD");

  console.log("\nChecking current PYUSD balance...");
  const balanceBefore = await pyusd.balanceOf(user.address);
  console.log("PYUSD Balance Before:", ethers.formatUnits(balanceBefore, 6), "PYUSD");

  console.log("\n" + "=".repeat(50));
  console.log("Claiming refund and rewards...");
  console.log("=".repeat(50));
  
  try {
    const tx = await router.claimRefundAndRewards(EVENT_ID, TIER_ID);
    console.log("\nTransaction hash:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    
    // Parse events
    console.log("\nTransaction Events:");
    for (const log of receipt.logs) {
      try {
        const parsedLog = event.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        if (parsedLog && parsedLog.name === "RewardsClaimed") {
          console.log("RewardsClaimed Event:");
          console.log("   - Tier ID:", parsedLog.args.tierId.toString());
          console.log("   - User:", parsedLog.args.user);
          console.log("   - Refund Amount:", ethers.formatUnits(parsedLog.args.refundAmount, 6), "PYUSD");
          console.log("   - Reward Amount:", ethers.formatUnits(parsedLog.args.rewardAmount, 6), "PYUSD");
        }
      } catch (e) {
        // Skip logs that don't match our interface
      }
    }

    console.log("\nVerifying claim...");
    const balanceAfter = await pyusd.balanceOf(user.address);
    const received = balanceAfter - balanceBefore;
    
    console.log("PYUSD Balance After:", ethers.formatUnits(balanceAfter, 6), "PYUSD");
    console.log("Amount Received:", ethers.formatUnits(received, 6), "PYUSD");

    // Check if user booking is marked as claimed
    const updatedUserBooking = await event.userBookingsByTier(user.address, TIER_ID);
    console.log("Updated Claim Status:", updatedUserBooking.hasClaimed);

    console.log("\n" + "=".repeat(50));
    console.log("REFUND AND REWARDS CLAIM SUCCESSFUL!");
    console.log("=".repeat(50));
    console.log("\nClaim Details:");
    console.log("- Event ID:", EVENT_ID);
    console.log("- Tier ID:", TIER_ID);
    console.log("- Refund Amount:", ethers.formatUnits(totalRefund, 6), "PYUSD");
    console.log("- Reward Amount:", ethers.formatUnits(rewardAmount, 6), "PYUSD");
    console.log("- Total Received:", ethers.formatUnits(received, 6), "PYUSD");
    console.log("- New Balance:", ethers.formatUnits(balanceAfter, 6), "PYUSD");

    console.log("\nNext Steps:");
    console.log("1. Your refund and rewards have been transferred to your wallet");
    console.log("2. You can use the PYUSD for other events or withdraw");
    console.log("3. Thank you for participating in the event!");

  } catch (error: any) {
    console.error("\nRefund and rewards claim failed!");
    console.error("Error:", error.message);
    
    // Parse common errors
    if (error.message.includes("Already claimed")) {
      console.error("\nYou have already claimed your refund and rewards");
    } else if (error.message.includes("Reveal not happened")) {
      console.error("\nReveal has not happened yet");
    } else if (error.message.includes("No booking found")) {
      console.error("\nNo booking found for this tier");
    } else if (error.message.includes("Winner")) {
      console.error("\nYou are a winner - use claimTicket script instead");
    }
    
    throw error;
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
