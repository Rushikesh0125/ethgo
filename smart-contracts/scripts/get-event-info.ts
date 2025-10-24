const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("Starting Event Information Script...\n");

  const [user] = await ethers.getSigners();
  console.log("Querying as user:", user.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(user.address)), "ETH\n");


  const ROUTER_ADDRESS = "0x735356F9cf30c239d00E5B7F667dB7D52fe784A3"; 
  const EVENT_ID = 0;          
  const USER_ADDRESS = user.address; 

  console.log("Getting contract instances...");
  const router = await ethers.getContractAt("EventRouter", ROUTER_ADDRESS);

  // Get event address
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

  
  console.log("\n" + "=".repeat(60));
  console.log("EVENT INFORMATION");
  console.log("=".repeat(60));

  const eventInfo = await event.getEventInfo();
  const currentTime = Math.floor(Date.now() / 1000);
  
  console.log("\nEvent Details:");
  console.log("- Name:", eventInfo.name);
  console.log("- Sale Start:", new Date(Number(eventInfo.saleStartTime) * 1000).toISOString());
  console.log("- Sale End:", new Date(Number(eventInfo.saleEndTime) * 1000).toISOString());
  console.log("- Reveal Time:", new Date(Number(eventInfo.revealTime) * 1000).toISOString());
  console.log("- Current Time:", new Date(currentTime * 1000).toISOString());

  // Determine event status
  let eventStatus = "Unknown";
  if (currentTime < Number(eventInfo.saleStartTime)) {
    eventStatus = "Not Started";
  } else if (currentTime < Number(eventInfo.saleEndTime)) {
    eventStatus = "Sale Active";
  } else if (currentTime < Number(eventInfo.revealTime)) {
    eventStatus = "Sale Ended - Waiting for Reveal";
  } else {
    eventStatus = "Revealed - Claims Available";
  }
  console.log("- Status:", eventStatus);

  console.log("\nTier Information:");
  
  const tierIds = [1, 2, 3]; 
  
  for (const tierId of tierIds) {
    try {
      const tierData = await event.getTierData(tierId);
      const bookingMetric = await event.getBookingMetric(tierId);
      
      console.log(`\nTier ${tierId}:`);
      console.log(`  - Gen Price: $${ethers.formatUnits(tierData.genPrice, 6)}`);
      console.log(`  - Premium Price: $${ethers.formatUnits(tierData.premiumPrice, 6)}`);
      console.log(`  - Max Supply: ${tierData.maxSupply}`);
      console.log(`  - Premium Max Supply: ${tierData.premiumMaxSupply}`);
      console.log(`  - Gen Seed: ${tierData.genSeed.toString()}`);
      console.log(`  - Premium Seed: ${tierData.premiumSeed.toString()}`);
      
      console.log(` Booking Metrics:`);
      console.log(`    - Total Bookings: ${bookingMetric.totalBookings}`);
      console.log(`    - Premium Bookings: ${bookingMetric.totalPremiumBookings}`);
      console.log(`    - Gen Bookings: ${bookingMetric.totalGenBookings}`);
      console.log(`    - Surplus Collected: ${ethers.formatUnits(bookingMetric.surplusCollected, 6)} PYUSD`);
      
      // Calculate availability
      const premiumAvailable = tierData.premiumMaxSupply - bookingMetric.totalPremiumBookings;
      const genAvailable = tierData.maxSupply - bookingMetric.totalGenBookings;
      
      console.log(`   Availability:`);
      console.log(`    - Premium Available: ${premiumAvailable}`);
      console.log(`    - Gen Available: ${genAvailable}`);
      console.log(`    - Premium Sold Out: ${premiumAvailable <= 0 ? "Yes" : "No"}`);
      console.log(`    - Gen Sold Out: ${genAvailable <= 0 ? "Yes" : "No"}`);
      
    } catch (error) {
      console.log(`Tier ${tierId}: Not found or error retrieving data`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`USER INFORMATION (${USER_ADDRESS})`);
  console.log("=".repeat(60));

  console.log("\nUser Bookings:");
  
  for (const tierId of tierIds) {
    try {
      const userBooking = await event.userBookingsByTier(USER_ADDRESS, tierId);
      
      if (userBooking.premiumIndex > 0 || userBooking.genIndex > 0) {
        console.log(`\nTier ${tierId}:`);
        console.log(`  - Has Premium Booking: ${userBooking.premiumIndex > 0}`);
        console.log(`  - Has Gen Booking: ${userBooking.genIndex > 0}`);
        console.log(`  - Has Claimed: ${userBooking.hasClaimed}`);
        
        if (currentTime >= Number(eventInfo.revealTime)) {
          // Check if user is a winner
          let isPremiumWinner = false;
          let isGenWinner = false;
          
          if (userBooking.premiumIndex > 0) {
            isPremiumWinner = await event.isWinner(tierId, 0, USER_ADDRESS);
            console.log(`  - Premium Winner: ${isPremiumWinner}`);
          }
          
          if (userBooking.genIndex > 0) {
            isGenWinner = await event.isWinner(tierId, 1, USER_ADDRESS);
            console.log(`  - Gen Winner: ${isGenWinner}`);
          }
          
          // Determine what user can do
          if (isPremiumWinner || isGenWinner) {
            console.log(`  - Action: Use claimTicket script to claim NFT`);
          } else if (!userBooking.hasClaimed) {
            console.log(`  - Action: Use claimRefundAndRewards script to claim refund`);
          } else {
            console.log(`  - Action: Already claimed`);
          }
        } else {
          console.log(`  - Action: Wait for reveal (${new Date(Number(eventInfo.revealTime) * 1000).toISOString()})`);
        }
      }
    } catch (error) {
      // Skip tiers that don't exist
    }
  }

  console.log("\nNFT Information:");
  
  try {
    const userNFTBalance = await ticketNFT.balanceOf(USER_ADDRESS);
    console.log(`- User NFT Balance: ${userNFTBalance}`);
    
    // Get total supply
    const totalSupply = await ticketNFT.totalSupply();
    console.log(`- Total NFTs Minted: ${totalSupply}`);
    
    // Get user's token IDs
    if (userNFTBalance > 0) {
      console.log(`- User's Token IDs:`);
      for (let i = 0; i < userNFTBalance; i++) {
        const tokenId = await ticketNFT.tokenOfOwnerByIndex(USER_ADDRESS, i);
        console.log(`  - Token ID: ${tokenId}`);
      }
    }
  } catch (error) {
    console.log("- NFT information not available or error occurred");
  }

  console.log("\n" + "=".repeat(60));
  console.log("CONTRACT ADDRESSES");
  console.log("=".repeat(60));
  
  console.log("\nContract Addresses:");
  console.log(`- EventRouter: ${ROUTER_ADDRESS}`);
  console.log(`- Event Contract: ${eventAddress}`);
  console.log(`- Ticket NFT: ${nftAddress}`);

  console.log("\n" + "=".repeat(60));
    console.log("SUMMARY & NEXT STEPS");
  console.log("=".repeat(60));
  
  console.log("\nEvent Summary:");
  console.log(`- Event: ${eventInfo.name}`);
  console.log(`- Status: ${eventStatus}`);
  console.log(`- Reveal Time: ${new Date(Number(eventInfo.revealTime) * 1000).toISOString()}`);
  
  console.log("\nAvailable Actions:");
  if (currentTime < Number(eventInfo.saleStartTime)) {
    console.log("- Wait for sale to start");
  } else if (currentTime < Number(eventInfo.saleEndTime)) {
    console.log("- Book tickets using book-tickets.ts script");
  } else if (currentTime < Number(eventInfo.revealTime)) {
    console.log("- Wait for reveal to happen");
  } else {
    console.log("- Check if you won tickets");
    console.log("- Claim tickets (if winner) or refunds (if not winner)");
  }
  
  console.log("\nAvailable Scripts:");
  console.log("- book-tickets.ts: Book tickets during sale period");
  console.log("- claim-ticket.ts: Claim NFT tickets (for winners)");
  console.log("- claim-refund-and-rewards.ts: Claim refunds and rewards (for non-winners)");
  console.log("- register-events.ts: Create new events (admin only)");
  console.log("- get-event-info.ts: Get comprehensive event information (this script)");

  console.log("\nEvent information retrieved successfully!");
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
