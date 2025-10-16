// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockPYUSD
 * @notice Mock PYUSD token for testing (6 decimals like real PYUSD)
 */
contract MockPYUSD is ERC20, Ownable {
    
    constructor() ERC20("PayPal USD", "PYUSD") Ownable(msg.sender) {}
    
    function decimals() public pure override returns (uint8) {
        return 6;  // PYUSD uses 6 decimals
    }
    
    /**
     * @notice Mint tokens to an address (for testing)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @notice Faucet function - anyone can mint 10000 PYUSD for testing
     */
    function faucet() external {
        _mint(msg.sender, 10000 * 10**6);  // 10,000 PYUSD
    }
    
    /**
     * @notice Batch mint to multiple addresses
     */
    function batchMint(address[] calldata recipients, uint256 amount) external onlyOwner {
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amount);
        }
    }
}
