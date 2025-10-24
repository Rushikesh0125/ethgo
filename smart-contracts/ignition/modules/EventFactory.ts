import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { config } from "dotenv";
import { configVariable } from "hardhat/config";

config();

export default buildModule("EventFactoryModule", (m) => {

    const eventFactory = m.contract("EventFactory", ["0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1", "0x07bc3643282fD005cd4B9B095209aD838B561B8a"]);
    return {eventFactory}
});
