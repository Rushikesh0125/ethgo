import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { config } from "dotenv";
import { configVariable } from "hardhat/config";

config();

export default buildModule("EventFactoryModule", (m) => {

    const eventFactory = m.contract("EventFactory", ["0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1", "0xAB0CbBc31Fafb3201b545b69C967FFc4510b94f8"]);
    return {eventFactory}
});
