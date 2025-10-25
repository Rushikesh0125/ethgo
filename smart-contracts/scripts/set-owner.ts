import hre from "hardhat";
import { EventRouter__factory } from "../types/ethers-contracts/index.js";

async function main() {
  const newOwner = "0xdAF6B85622907cD2b6B52dEc72b32e60084054a9";
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

  if (owner.toLowerCase() === newOwner.toLowerCase()) {
    console.log("Owner already set:", { routerAddress, owner: newOwner });
    return;
  }

  const tx = await router.setOwner(newOwner);
  await tx.wait();
  console.log("Owner updated:", { routerAddress, oldOwner: owner, newOwner, txHash: tx.hash });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});


