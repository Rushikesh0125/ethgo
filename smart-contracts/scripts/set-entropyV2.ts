import hre from "hardhat";
import { EventRouter__factory } from "../types/ethers-contracts/index.js";

async function main() {
  const newEntropyV2 = "0xEntropyV2AddressHere";
  const routerAddress = "0xc26e5ACB391fB339D5baBF1f184742bF201cDf4B";

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

  const current = await router.getEntropy();
  console.log("currentEntropyV2", current);
  if (current.toLowerCase() === newEntropyV2.toLowerCase()) {
    console.log("EntropyV2 already set:", { routerAddress, entropyV2: newEntropyV2 });
    return;
  }

  const tx = await router.setEntropyV2(newEntropyV2);
  await tx.wait();
  console.log("EntropyV2 updated:", { routerAddress, oldEntropyV2: current, newEntropyV2, txHash: tx.hash });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});


