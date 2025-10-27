import hre from "hardhat";
import { EventRouter__factory } from "../types/ethers-contracts/index.js";



async function main() {
  const chainId = process.env.DEPLOYMENT_CHAIN_ID || "421614";
  const eventId = BigInt(process.env.EVENT_ID || "0");
  const tierId = BigInt(process.env.TIER_ID || "1");
  const slot = BigInt(process.env.SLOT || "1"); // 0=premium, 1=gen

  const routerAddress = "0x8D7078065c06674394106b878e15545502322425"

  const connection = await hre.network.connect();
  const { ethers } = connection as any;
  const [sender] = await ethers.getSigners();
  const router = EventRouter__factory.connect(routerAddress, sender);

  const tx = await router.unregisterBooking(eventId, tierId, slot);
  await tx.wait();
  console.log("Unregistered booking:", { txHash: tx.hash, eventId: eventId.toString(), tierId: tierId.toString(), slot: slot.toString() });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});


