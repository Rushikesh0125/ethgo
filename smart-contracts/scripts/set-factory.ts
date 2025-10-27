
import hre from "hardhat";
import { EventRouter__factory } from "../types/ethers-contracts/index.js";

async function main() {
  const newFactory = "0xa63134f49048B21Ae521dB421b3FA9535f5A0743";
  const routerAddress = "0xc26e5ACB391fB339D5baBF1f184742bF201cDf4B"

  const connection = await hre.network.connect();
  const { ethers } = connection as any;
  const [sender] = await ethers.getSigners();
  const router = EventRouter__factory.connect(routerAddress, sender);

  const owner = await router.owner();
  const senderAddr = await sender.getAddress();
  if (owner.toLowerCase() !== senderAddr.toLowerCase()) {
    throw new Error(
      `Sender ${senderAddr} is not router owner ${owner}. Use owner key.`
    );
  }

  const currentFactory = await router.factory();
  console.log("currentFactory", currentFactory);
  if (currentFactory.toLowerCase() === newFactory.toLowerCase()) {
    console.log("Factory already set:", { routerAddress, factory: newFactory });
    return;
  }

  const tx = await router.setFactory(newFactory);
  await tx.wait();
  console.log("Factory updated:", { routerAddress, oldFactory: currentFactory, newFactory, txHash: tx.hash });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});


