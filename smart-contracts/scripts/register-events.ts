const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("Starting Event Creation Script...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  const PYUSD_ADDRESS = "0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1"; 
  const ROUTER_ADDRESS = "0x735356F9cf30c239d00E5B7F667dB7D52fe784A3"; 
  const FACTORY_ADDRESS = "0x961bFEa0C4e2879CeadCBcfE21EBD77ECEcfA04d"; 


  let factoryAddress = FACTORY_ADDRESS;
  
  if (!FACTORY_ADDRESS || FACTORY_ADDRESS === "0x961bFEa0C4e2879CeadCBcfE21EBD77ECEcfA04d") {
    console.log("Deploying EventFactory...");
    const EventFactory = await ethers.getContractFactory("EventFactory");
    const factory = await EventFactory.deploy(PYUSD_ADDRESS, ROUTER_ADDRESS);
    await factory.waitForDeployment();
    factoryAddress = await factory.getAddress();
    console.log("EventFactory deployed to:", factoryAddress);
    console.log("Waiting for block confirmations...\n");
    await factory.deploymentTransaction().wait(5);
  } else {
    console.log("Using existing EventFactory at:", factoryAddress, "\n");
  }

  
  
  const eventName = "Summer Music Festival 2025";
  const metadataUri = "ipfs://QmYourMetadataHash/"; 
  
  const now = Math.floor(Date.now() / 1000);
  const saleStartTime = now + 300; // Start in 5 minutes
  const saleEndTime = now + (7 * 24 * 60 * 60); // 7 days from now
  const revealTime = now + (8 * 24 * 60 * 60); // 8 days from now

  console.log("Event Configuration:");
  console.log("- Name:", eventName);
  console.log("- Sale Start:", new Date(saleStartTime * 1000).toISOString());
  console.log("- Sale End:", new Date(saleEndTime * 1000).toISOString());
  console.log("- Reveal Time:", new Date(revealTime * 1000).toISOString());
  console.log("");

  
  const tierIds = [1, 2, 3]; // VIP, Gold, Silver
  
  // Tier Data
  const tierDataArray = [
    {
      genPrice: ethers.parseUnits("100", 6),      // $100 PYUSD (6 decimals)
      premiumPrice: ethers.parseUnits("150", 6),  // $150 PYUSD
      maxSupply: 100,                              // 100 total tickets
      premiumMaxSupply: 30,                        // 30 premium tickets
      genSeed: 0,                                  // Will be set later
      premiumSeed: 0                               // Will be set later
    },
    {
      genPrice: ethers.parseUnits("50", 6),       // $50 PYUSD
      premiumPrice: ethers.parseUnits("75", 6),   // $75 PYUSD
      maxSupply: 200,                              // 200 total tickets
      premiumMaxSupply: 50,                        // 50 premium tickets
      genSeed: 0,
      premiumSeed: 0
    },
    {
      genPrice: ethers.parseUnits("25", 6),       // $25 PYUSD
      premiumPrice: ethers.parseUnits("35", 6),   // $35 PYUSD
      maxSupply: 500,                              // 500 total tickets
      premiumMaxSupply: 100,                       // 100 premium tickets
      genSeed: 0,
      premiumSeed: 0
    }
  ];

  console.log("Tier Configuration:");
  tierIds.forEach((id, index) => {
    const tier = tierDataArray[index];
    console.log(`\nTier ${id}:`);
    console.log(`  - Gen Price: $${ethers.formatUnits(tier.genPrice, 6)}`);
    console.log(`  - Premium Price: $${ethers.formatUnits(tier.premiumPrice, 6)}`);
    console.log(`  - Max Supply: ${tier.maxSupply}`);
    console.log(`  - Premium Max Supply: ${tier.premiumMaxSupply}`);
  });
  console.log("");

 
  
  console.log("Creating event...");
  const factory = await ethers.getContractAt("EventFactory", factoryAddress);
  
  const tx = await factory.createEvent(
    eventName,
    saleStartTime,
    saleEndTime,
    revealTime,
    tierIds,
    tierDataArray,
    metadataUri
  );

  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");
  
  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);
 
  console.log("\nEvent created successfully!");
  console.log("Check the EventRouter for the new event ID and addresses");
  console.log("Router address:", ROUTER_ADDRESS);
  

  console.log("\n✅ Event creation complete!");
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });