import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { config } from "dotenv";
import { configVariable } from "hardhat/config";

config();

export default buildModule("EventFactoryModule", (m) => {

    const eventFactory = m.contract("EventFactory", ["0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1", "0x735356F9cf30c239d00E5B7F667dB7D52fe784A3"]);
    return {eventFactory}
});
