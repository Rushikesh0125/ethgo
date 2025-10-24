import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { config } from "dotenv";
import { configVariable } from "hardhat/config";
config();

export default buildModule("EventRouterModule", (m) => {
    
    const eventRouter = m.contract("EventRouter", ["0x549Ebba8036Ab746611B4fFA1423eb0A4Df61440"]);
    return {eventRouter}
});
