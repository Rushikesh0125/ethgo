const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("Starting Ticket Claim Script...\n");

  const [user] = await ethers.getSigners();
  console.log("Claiming as user:", user.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(user.address)), "ETH\n");

  const ROUTER_ADDRESS = "0x735356F9cf30c239d00E5B7F667dB7D52fe784A3"; 
  const EVENT_ID = 0;          
  const TIER_ID = 1;              

  console.log("Getting contract instances...");
  const router = await ethers.getContractAt("EventRouter", ROUTER_ADDRESS);

  const eventAddress = await router.eventAddresses(EVENT_ID);
  if (eventAddress === ethers.ZeroAddress) {
    throw new Error(`Event ID ${EVENT_ID} not found`);
  }
  console.log("Event Address:", eventAddress);

  const event = await ethers.getContractAt("IEvent", eventAddress);

  const nftAddress = await router.ticketNFTAddresses(EVENT_ID);
  if (nftAddress === ethers.ZeroAddress) {
    throw new Error(`NFT contract not found for Event ID ${EVENT_ID}`);
  }
  console.log("NFT Contract Address:", nftAddress);

  const ticketNFT = await ethers.getContractAt("ITicketNFT", nftAddress);

  console.log("\nChecking event status and eligibility...");
  
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
  let winningSlot = -1;

  if (userBooking.premiumIndex > 0) {
    const isPremiumWinner = await event.isWinner(TIER_ID, 0, user.address);
    console.log("- Premium Winner:", isPremiumWinner);
    if (isPremiumWinner) {
      isWinner = true;
      winningSlot = 0;
    }
  }

  if (userBooking.genIndex > 0) {
    const isGenWinner = await event.isWinner(TIER_ID, 1, user.address);
    console.log("- Gen Winner:", isGenWinner);
    if (isGenWinner) {
      isWinner = true;
      winningSlot = 1;
    }
  }

  if (!isWinner) {
    throw new Error(`User ${user.address} is not a winner for tier ${TIER_ID}. Use claimRefundAndRewards script instead.`);
  }

  console.log(`User is a winner in ${winningSlot === 0 ? 'Premium' : 'General'} slot!`);

  console.log("\nGetting tier information...");
  const tierData = await event.getTierData(TIER_ID);
  const ticketPrice = await event.getTicketPrice(TIER_ID, winningSlot);
  
  console.log("Tier Information:");
  console.log("- Tier ID:", TIER_ID);
  console.log("- Winning Slot:", winningSlot === 0 ? "Premium" : "General");
  console.log("- Ticket Price:", ethers.formatUnits(ticketPrice, 6), "PYUSD");
  console.log("- Max Supply:", tierData.maxSupply.toString());
  console.log("- Premium Max Supply:", tierData.premiumMaxSupply.toString());

  console.log("\nChecking current NFT balance...");
  const balanceBefore = await ticketNFT.balanceOf(user.address);
  console.log("NFT Balance Before:", balanceBefore.toString());

  console.log("\n" + "=".repeat(50));
  console.log("Claiming ticket...");
  console.log("=".repeat(50));
  
  try {
    const tx = await router.claimTicket(EVENT_ID, TIER_ID);
    console.log("\nTransaction hash:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    
    // Parse events
    console.log("\nTransaction Events:");
    for (const log of receipt.logs) {
      try {
        const parsedLog = ticketNFT.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        if (parsedLog && parsedLog.name === "Transfer") {
          console.log("NFT Transfer Event:");
          console.log("   - From:", parsedLog.args.from);
          console.log("   - To:", parsedLog.args.to);
          console.log("   - Token ID:", parsedLog.args.tokenId.toString());
        }
      } catch (e) {
        // Skip logs that don't match our interface
      }
    }


    console.log("\nVerifying claim...");
    const balanceAfter = await ticketNFT.balanceOf(user.address);
    const newNFTs = balanceAfter - balanceBefore;
    
    console.log("NFT Balance After:", balanceAfter.toString());
    console.log("New NFTs Received:", newNFTs.toString());

    const updatedUserBooking = await event.userBookingsByTier(user.address, TIER_ID);
    console.log("Updated Claim Status:", updatedUserBooking.hasClaimed);

    console.log("\n" + "=".repeat(50));
    console.log("TICKET CLAIM SUCCESSFUL!");
    console.log("=".repeat(50));
    console.log("\nClaim Details:");
    console.log("- Event ID:", EVENT_ID);
    console.log("- Tier ID:", TIER_ID);
    console.log("- Winning Slot:", winningSlot === 0 ? "Premium" : "General");
    console.log("- NFTs Received:", newNFTs.toString());
    console.log("- Total NFT Balance:", balanceAfter.toString());

    console.log("\nNext Steps:");
    console.log("1. Your NFT ticket has been minted to your wallet");
    console.log("2. You can view it in your wallet or NFT marketplace");
    console.log("3. Use this NFT for event entry");

  } catch (error: any) {
    console.error("\nTicket claim failed!");
    console.error("Error:", error.message);
    
    if (error.message.includes("Not a winner")) {
      console.error("\nYou are not a winner for this tier");
    } else if (error.message.includes("Already claimed")) {
      console.error("\nYou have already claimed your ticket");
    } else if (error.message.includes("Reveal not happened")) {
      console.error("\nReveal has not happened yet");
    } else if (error.message.includes("No booking found")) {
      console.error("\nNo booking found for this tier");
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
