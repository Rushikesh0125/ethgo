// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockEntropy
 * @notice Mock Pyth Entropy contract for testing VRF functionality
 * @dev Simulates Pyth Entropy's request-reveal pattern
 */
contract MockEntropy {
    
    struct RandomRequest {
        address requester;
        bytes32 userCommitment;
        bool useBlockHash;
        uint64 blockNumber;
        bytes32 randomNumber;
        bool fulfilled;
    }
    
    uint64 private _sequenceNumber;
    uint128 public fee = 0.001 ether;  // Mock fee
    
    mapping(uint64 => RandomRequest) public requests;
    mapping(address => bool) public providers;
    
    event RandomnessRequested(
        uint64 indexed sequenceNumber,
        address indexed requester,
        bytes32 userCommitment
    );
    
    event RandomnessRevealed(
        uint64 indexed sequenceNumber,
        bytes32 randomNumber
    );
    
    constructor() {
        // Default provider
        providers[msg.sender] = true;
    }
    
    function addProvider(address provider) external {
        providers[provider] = true;
    }
    
    /**
     * @notice Request random number
     */
    function request(
        address provider,
        bytes32 userCommitment,
        bool useBlockHash
    ) external payable returns (uint64 sequenceNumber) {
        require(msg.value >= fee, "Insufficient fee");
        require(providers[provider], "Invalid provider");
        
        sequenceNumber = ++_sequenceNumber;
        
        requests[sequenceNumber] = RandomRequest({
            requester: msg.sender,
            userCommitment: userCommitment,
            useBlockHash: useBlockHash,
            blockNumber: uint64(block.number),
            randomNumber: bytes32(0),
            fulfilled: false
        });
        
        emit RandomnessRequested(sequenceNumber, msg.sender, userCommitment);
        
        return sequenceNumber;
    }
    
    /**
     * @notice Reveal random number
     */
    function reveal(
        address provider,
        uint64 sequenceNumber,
        bytes32 userRandomNumber
    ) external returns (bytes32 randomNumber) {
        require(providers[provider], "Invalid provider");
        
        RandomRequest storage req = requests[sequenceNumber];
        require(req.requester != address(0), "Request not found");
        require(!req.fulfilled, "Already fulfilled");
        
        // Verify user commitment
        bytes32 computedCommitment = keccak256(abi.encodePacked(userRandomNumber));
        require(computedCommitment == req.userCommitment, "Invalid commitment");
        
        // Generate mock random number
        randomNumber = keccak256(abi.encodePacked(
            userRandomNumber,
            block.prevrandao,
            block.timestamp,
            req.blockNumber,
            sequenceNumber
        ));
        
        req.randomNumber = randomNumber;
        req.fulfilled = true;
        
        emit RandomnessRevealed(sequenceNumber, randomNumber);
        
        return randomNumber;
    }
    
    /**
     * @notice Get fee for provider
     */
    function getFee(address provider) external view returns (uint128) {
        require(providers[provider], "Invalid provider");
        return fee;
    }
    
    /**
     * @notice Set fee (for testing)
     */
    function setFee(uint128 _fee) external {
        fee = _fee;
    }
    
    /**
     * @notice Get request details
     */
    function getRequest(uint64 sequenceNumber) external view returns (RandomRequest memory) {
        return requests[sequenceNumber];
    }
    
    /**
     * @notice Withdraw collected fees
     */
    function withdraw() external {
        payable(msg.sender).transfer(address(this).balance);
    }
    
    receive() external payable {}
}
