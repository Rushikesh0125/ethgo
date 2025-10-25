
import hre from "hardhat";
import { EventFactory__factory, EventRouter__factory } from "../types/ethers-contracts/index.js";

type TierInput = {
  id: number;
  genPrice: string | number; // raw token units
  premiumPrice: string | number; // raw token units
  maxSupply: number;
  premiumMaxSupply: number;
};

type EventConfig = {
  name: string;
  saleStartTime: number;
  saleEndTime: number;
  revealTime: number;
  metadataUri: string;
  tiers: TierInput[];
};


function loadConfig(): EventConfig {
  const now = Math.floor(Date.now() / 1000);
  return {
    name: "Demo Event",
    saleStartTime: now + 60, // starts in 1 minute
    saleEndTime: now + 3600, // 1 hour sale
    revealTime: now + 7200, // reveal after 2 hours
    metadataUri:
      "ipfs://bafybeihjjkwdrxxjnuwevlqtqmh3iegcadc32sio4wmo7bv2gbf34qs34a/{id}.json",
    tiers: [
      {
        id: 1,
        genPrice: "1000000", // 1.0 PYUSD (6 decimals)
        premiumPrice: "2000000", // 2.0 PYUSD
        maxSupply: 100,
        premiumMaxSupply: 20,
      },
      {
        id: 2,
        genPrice: "500000", // 0.5 PYUSD
        premiumPrice: "900000", // 0.9 PYUSD
        maxSupply: 200,
        premiumMaxSupply: 50,
      },
    ],
  };
}

async function main() {
  const chainId = process.env.DEPLOYMENT_CHAIN_ID || "421614";
  const routerAddress = "0x8D7078065c06674394106b878e15545502322425"
  const factoryAddress ="0xC5D9CF642193fe279C6D9B7adA6048cBc48DfD6b";

  const connection = await hre.network.connect();
  const { ethers } = connection as any;
  const [deployer] = await ethers.getSigners();

  const router = EventRouter__factory.connect(routerAddress, deployer);
  const factory = EventFactory__factory.connect(factoryAddress, deployer);

  // Ensure router.factory is set to factoryAddress
  const currentFactory = await router.factory();
  if (currentFactory.toLowerCase() !== factoryAddress.toLowerCase()) {
    const owner = await router.owner();
    if (owner.toLowerCase() !== (await deployer.getAddress()).toLowerCase()) {
      throw new Error(
        `Router.factory is not set. Please run setFactory as router owner ${owner} or use the correct private key.`
      );
    }
    const tx = await router.setFactory(factoryAddress);
    await tx.wait();
  }

  const cfg = loadConfig();

  const tierIds = cfg.tiers.map((t) => BigInt(t.id));
  const tierDataArray = cfg.tiers.map((t) => ({
    genPrice: BigInt(t.genPrice as any),
    premiumPrice: BigInt(t.premiumPrice as any),
    maxSupply: BigInt(t.maxSupply),
    premiumMaxSupply: BigInt(t.premiumMaxSupply),
    genSeed: 0n,
    premiumSeed: 0n,
  }));

  const tx = await factory.createEvent(
    cfg.name,
    String(cfg.saleStartTime),
    String(cfg.saleEndTime),
    String(cfg.revealTime),
    tierIds,
    tierDataArray,
    cfg.metadataUri
  );
  await tx.wait();

  // EventFactory returns eventId; parse from return data if present
  // ethers v6 returns the function result in receipt.logs decoding is complex; simply
  // call nextEventId-1 via router as confirmation path:
  // We don’t know eventId from router mapping; the factory returns it reliably in v6
  await tx.wait();
  // Best-effort: show a hint to check by querying router.eventAddresses

  console.log("Event created. You can verify with router.eventAddresses(eventId).");
  console.log({ routerAddress, factoryAddress, txHash: tx.hash });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
