import type { HardhatUserConfig } from "hardhat/config";
import { configVariable } from "hardhat/config";
import HardhatIgnitionEthersPlugin from "@nomicfoundation/hardhat-ignition-ethers";
import hardhatKeystore from "@nomicfoundation/hardhat-keystore";

const config: HardhatUserConfig = {
  plugins: [HardhatIgnitionEthersPlugin, hardhatKeystore],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    arbSepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("ARB_SEPOLIA_RPC_URL"),
      accounts: [configVariable("ARB_SEPOLIA_PRIVATE_KEY")],
    },
  },
};

export default config;
