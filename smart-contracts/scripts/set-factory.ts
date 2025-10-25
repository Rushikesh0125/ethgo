
import hre from "hardhat";
import { EventRouter__factory } from "../types/ethers-contracts/index.js";

async function main() {
  const newFactory = "0xC5D9CF642193fe279C6D9B7adA6048cBc48DfD6b";
  const routerAddress = "0x8D7078065c06674394106b878e15545502322425"

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


