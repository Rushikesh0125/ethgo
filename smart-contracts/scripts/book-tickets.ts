const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("Starting Ticket Booking Script...\n");

  const [user] = await ethers.getSigners();
  console.log("Booking as user:", user.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(user.address)), "ETH\n");

  const ROUTER_ADDRESS = "0x735356F9cf30c239d00E5B7F667dB7D52fe784A3"; 
  const PYUSD_ADDRESS = "0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1"; 
  const EVENT_ID = 0;          
  const TIER_ID = 1;              
  const SLOT = 0;                 

  console.log("Getting contract instances...");
  const router = await ethers.getContractAt("EventRouter", ROUTER_ADDRESS);
  const pyusd = await ethers.getContractAt("IERC20", PYUSD_ADDRESS);

  const eventAddress = await router.eventAddresses(EVENT_ID);
  if (eventAddress === ethers.ZeroAddress) {
    throw new Error(`Event ID ${EVENT_ID} not found`);
  }
  console.log("Event Address:", eventAddress);

  const event = await ethers.getContractAt("IEvent", eventAddress);

  console.log("\nFetching ticket information...");
  const ticketPrice = await event.getTicketPrice(TIER_ID, SLOT);
  const tierData = await event.getTierData(TIER_ID);
  const bookingMetric = await event.getBookingMetric(TIER_ID);

  console.log("\nTier Information:");
  console.log("- Tier ID:", TIER_ID);
  console.log("- Slot:", SLOT === 0 ? "Premium" : "General");
  console.log("- Ticket Price:", ethers.formatUnits(ticketPrice, 6), "PYUSD");
  console.log("- Max Supply:", tierData.maxSupply.toString());
  console.log("- Premium Max Supply:", tierData.premiumMaxSupply.toString());
  console.log("- Total Bookings:", bookingMetric.totalBookings.toString());
  console.log("- Premium Bookings:", bookingMetric.totalPremiumBookings.toString());
  console.log("- Gen Bookings:", bookingMetric.totalGenBookings.toString());

  // Calculate availability
  const maxForSlot = SLOT === 0 ? tierData.premiumMaxSupply : tierData.maxSupply;
  const currentBookings = SLOT === 0 ? bookingMetric.totalPremiumBookings : bookingMetric.totalGenBookings;
  console.log("\nAvailability:");
  console.log("- Slots available:", maxForSlot.toString());
  console.log("- Current bookings:", currentBookings.toString());
  console.log("- Remaining:", (maxForSlot - currentBookings).toString());

  console.log("\nChecking PYUSD balance and allowance...");
  const balance = await pyusd.balanceOf(user.address);
  const allowance = await pyusd.allowance(user.address, ROUTER_ADDRESS);

  console.log("- PYUSD Balance:", ethers.formatUnits(balance, 6), "PYUSD");
  console.log("- Current Allowance:", ethers.formatUnits(allowance, 6), "PYUSD");

  if (balance < ticketPrice) {
    throw new Error(`Insufficient PYUSD balance. Need ${ethers.formatUnits(ticketPrice, 6)} PYUSD`);
  }

 
  if (allowance < ticketPrice) {
    console.log("\nApproving PYUSD...");
    // Approve a reasonable amount (e.g., 10000 PYUSD)
    const approvalAmount = ethers.parseUnits("10000", 6);
    const approveTx = await pyusd.approve(ROUTER_ADDRESS, approvalAmount);
    console.log("Approval transaction hash:", approveTx.hash);
    console.log("Waiting for confirmation...");
    await approveTx.wait();
    console.log("PYUSD approved");
  } else {
    console.log("Sufficient allowance already exists");
  }


  console.log("\n" + "=".repeat(50));
  console.log("Registering booking...");
  console.log("=".repeat(50));
  
  try {
    const tx = await router.registerBooking(EVENT_ID, TIER_ID, SLOT);
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
        if (parsedLog && parsedLog.name === "BookingRegistered") {
          console.log("BookingRegistered Event:");
          console.log("   - Tier ID:", parsedLog.args.tierId.toString());
          console.log("   - Slot:", parsedLog.args.slot.toString());
          console.log("   - User:", parsedLog.args.user);
        }
      } catch (e) {
        // Skip logs that don't match our interface
      }
    }

    console.log("\nVerifying booking...");
    const updatedMetric = await event.getBookingMetric(TIER_ID);
    console.log("Updated booking metrics:");
    console.log("- Total Bookings:", updatedMetric.totalBookings.toString());
    console.log("- Premium Bookings:", updatedMetric.totalPremiumBookings.toString());
    console.log("- Gen Bookings:", updatedMetric.totalGenBookings.toString());

    // Get final balance
    const finalBalance = await pyusd.balanceOf(user.address);
    const spent = balance - finalBalance;
    console.log("\nPayment Summary:");
    console.log("- Amount Spent:", ethers.formatUnits(spent, 6), "PYUSD");
    console.log("- Remaining Balance:", ethers.formatUnits(finalBalance, 6), "PYUSD");

    console.log("\n" + "=".repeat(50));
    console.log("BOOKING SUCCESSFUL!");
    console.log("=".repeat(50));
    console.log("\nBooking Details:");
    console.log("- Event ID:", EVENT_ID);
    console.log("- Tier ID:", TIER_ID);
    console.log("- Slot:", SLOT === 0 ? "Premium" : "General");
    console.log("- Price Paid:", ethers.formatUnits(ticketPrice, 6), "PYUSD");
    console.log("\nNext Steps:");
    console.log("1. Wait for sale period to end");
    console.log("2. Wait for seed allotment (randomness)");
    console.log("3. Check if you won after reveal time");
    console.log("4. Claim your ticket NFT or refund");

  } catch (error: any) {
    console.error("\n Booking failed!");
    console.error("Error:", error.message);
    
    // Parse common errors
    if (error.message.includes("Sale not active")) {
      console.error("\nSale is not currently active");
    } else if (error.message.includes("Duplicate booking")) {
      console.error("\nYou already have a booking for this tier/slot");
    } else if (error.message.includes("Tier not found")) {
      console.error("\nInvalid tier ID");
    } else if (error.message.includes("Invalid slot")) {
      console.error("\nSlot must be 0 (Premium) or 1 (General)");
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