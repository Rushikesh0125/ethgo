import hre from "hardhat";
import { EventRouter__factory } from "../types/ethers-contracts/index.js";

async function main() {
  const chainId = process.env.DEPLOYMENT_CHAIN_ID || "421614";
  const eventId = BigInt(process.env.EVENT_ID || "0");
  const tierId = BigInt(process.env.TIER_ID || "2");
  const slot = BigInt(process.env.SLOT || "1"); // 0=premium, 1=gen

  const routerAddress = "0xc26e5ACB391fB339D5baBF1f184742bF201cDf4B"

  const connection = await hre.network.connect();
  const { ethers } = connection as any;
  const [sender] = await ethers.getSigners();
  const router = EventRouter__factory.connect(routerAddress, sender);

  // Resolve price and PYUSD address for approval
  const eventAddr = await router.eventAddresses(eventId);
  if (eventAddr === "0x0000000000000000000000000000000000000000") {
    throw new Error(`Invalid eventId ${eventId.toString()}`);
  }

  const iEvent = new ethers.Contract(
    eventAddr,
    [
      "function getTicketPrice(uint256 tierId, uint256 slot) view returns (uint256)",
    ],
    sender
  );
  const price: bigint = await iEvent.getFunction("getTicketPrice")(tierId, slot);

  const pyUsd = await router.pyUsd();
  const erc20 = new ethers.Contract(
    pyUsd,
    [
      "function allowance(address owner, address spender) view returns (uint256)",
      "function approve(address spender, uint256 amount) returns (bool)",
    ],
    sender
  );

  const ownerAddr = await sender.getAddress();
  const currentAllow: bigint = await erc20.allowance(ownerAddr, routerAddress);
  if (currentAllow < price) {
    const txA = await erc20.approve(routerAddress, price);
    await txA.wait();
  }

  const tx = await router.registerBooking(eventId, tierId, slot);
  await tx.wait();
  console.log("Booked:", { txHash: tx.hash, eventId: eventId.toString(), tierId: tierId.toString(), slot: slot.toString() });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});


