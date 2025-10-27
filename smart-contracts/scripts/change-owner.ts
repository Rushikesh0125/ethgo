
import hre from "hardhat";
import { EventFactory__factory, EventRouter__factory } from "../types/ethers-contracts/index.js";

async function main() {
  const factoryAddress ="0xa63134f49048B21Ae521dB421b3FA9535f5A0743";
  const newOwner = "0xdAF6B85622907cD2b6B52dEc72b32e60084054a9";
  const connection = await hre.network.connect();
  const { ethers } = connection as any;
  const [deployer] = await ethers.getSigners();

  const factory = EventFactory__factory.connect(factoryAddress, deployer);

  // Ensure router.factory is set to factoryAddress
  const tx = await factory.transferOwnership(
    newOwner
  );
  await tx.wait();

  console.log("Owner changed.");
  console.log({factoryAddress, newOwner, txHash: tx.hash });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
