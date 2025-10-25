import hre from "hardhat";
import { EventRouter__factory } from "../types/ethers-contracts/index.js";

async function main() {
  const newPyUsd = "0xPyUsdAddressHere";
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

  const current = await router.pyUsd();
  console.log("currentPyUsd", current);
  if (current.toLowerCase() === newPyUsd.toLowerCase()) {
    console.log("PYUSD already set:", { routerAddress, pyUsd: newPyUsd });
    return;
  }

  const tx = await router.setPyUsd(newPyUsd);
  await tx.wait();
  console.log("PYUSD updated:", { routerAddress, oldPyUsd: current, newPyUsd, txHash: tx.hash });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});


