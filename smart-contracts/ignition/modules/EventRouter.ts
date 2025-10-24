import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { config } from "dotenv";
import { configVariable } from "hardhat/config";
config();

export default buildModule("EventRouterModule", (m) => {
    
    const eventRouter = m.contract("EventRouter", ["0x549Ebba8036Ab746611B4fFA1423eb0A4Df61440", "0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1"]);
    return {eventRouter}
});
