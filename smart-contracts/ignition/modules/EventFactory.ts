import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";

export default buildModule("EventFactoryModule", (m) => {


    const eventFactory = m.contract("EventFactory", ["0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1", "0x8D7078065c06674394106b878e15545502322425"]);
    
    //m.call(eventFactory, "transferOwnership", ["0xdAF6B85622907cD2b6B52dEc72b32e60084054a9"]);
    
    return {eventFactory}
});
