// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IdentityVerifier
 * @notice Manages identity verification using World ID (or similar proof-of-personhood)
 * @dev Stores identity commitments without revealing PII
 */
contract IdentityVerifier is Ownable {
    
    // ============ Structs ============
    
    struct Identity {
        bytes32 commitment;       // Hash of identity data
        bytes32 nullifierHash;    // World ID nullifier hash
        uint256 registeredAt;
        bool verified;
    }
    
    // ============ State Variables ============
    
    // World ID integration (mock for testnet)
    address public worldIdRouter;
    
    // Identity storage
    mapping(address => mapping(uint256 => Identity)) public identities;  // user => eventId => Identity
    mapping(bytes32 => bool) public usedNullifiers;  // nullifierHash => used (prevent double-registration)
    mapping(address => bytes32) public globalIdentityCommitment;  // user => global commitment
    
    // Whitelist for testing (bypass World ID on testnet)
    mapping(address => bool) public whitelisted;
    bool public whitelistMode;
    
    // ============ Events ============
    
    event IdentityRegistered(
        address indexed user,
        uint256 indexed eventId,
        bytes32 commitment,
        bytes32 nullifierHash
    );
    
    event IdentityVerified(
        address indexed user,
        uint256 indexed eventId,
        bool success
    );
    
    event WhitelistUpdated(address indexed user, bool status);
    event WhitelistModeChanged(bool enabled);
    
    // ============ Errors ============
    
    error IdentityAlreadyRegistered();
    error NullifierAlreadyUsed();
    error IdentityNotRegistered();
    error VerificationFailed();
    error InvalidProof();
    
    // ============ Constructor ============
    
    constructor() Ownable(msg.sender) {
        whitelistMode = true;  // Enable for testnet
    }
    
    // ============ Admin Functions ============
    
    function setWorldIdRouter(address _worldIdRouter) external onlyOwner {
        worldIdRouter = _worldIdRouter;
    }
    
    function setWhitelistMode(bool _enabled) external onlyOwner {
        whitelistMode = _enabled;
        emit WhitelistModeChanged(_enabled);
    }
    
    function addToWhitelist(address user) external onlyOwner {
        whitelisted[user] = true;
        emit WhitelistUpdated(user, true);
    }
    
    function removeFromWhitelist(address user) external onlyOwner {
        whitelisted[user] = false;
        emit WhitelistUpdated(user, false);
    }
    
    function batchWhitelist(address[] calldata users) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            whitelisted[users[i]] = true;
            emit WhitelistUpdated(users[i], true);
        }
    }
    
    // ============ Identity Functions ============
    
    /**
     * @notice Register identity for an event
     * @param user User address
     * @param eventId Event ID
     * @param commitment Identity commitment hash
     * @param proof World ID ZK proof (or mock proof)
     */
    function registerIdentity(
        address user,
        uint256 eventId,
        bytes32 commitment,
        bytes calldata proof
    ) external {
        // Check if already registered
        if (identities[user][eventId].verified) {
            revert IdentityAlreadyRegistered();
        }
        
        bytes32 nullifierHash;
        
        // Testnet mode: simple verification
        if (whitelistMode) {
            if (!whitelisted[user]) {
                revert VerificationFailed();
            }
            // Generate mock nullifier
            nullifierHash = keccak256(abi.encodePacked(user, eventId, "MOCK_NULLIFIER"));
        } else {
            // Production: Verify World ID proof
            (bool success, bytes32 _nullifierHash) = _verifyWorldIdProof(user, eventId, proof);
            if (!success) {
                revert InvalidProof();
            }
            nullifierHash = _nullifierHash;
            
            // Check nullifier hasn't been used
            if (usedNullifiers[nullifierHash]) {
                revert NullifierAlreadyUsed();
            }
        }
        
        // Store identity
        identities[user][eventId] = Identity({
            commitment: commitment,
            nullifierHash: nullifierHash,
            registeredAt: block.timestamp,
            verified: true
        });
        
        usedNullifiers[nullifierHash] = true;
        
        // Update global commitment
        if (globalIdentityCommitment[user] == bytes32(0)) {
            globalIdentityCommitment[user] = commitment;
        }
        
        emit IdentityRegistered(user, eventId, commitment, nullifierHash);
    }
    
    /**
     * @notice Verify identity proof
     * @param user User address
     * @param proof ZK proof
     */
    function verifyIdentity(address user, bytes calldata proof) external view returns (bool) {
        // Testnet mode: simple check
        if (whitelistMode) {
            return whitelisted[user];
        }
        
        // Production: verify proof against stored commitment
        // This is a simplified version - real implementation would verify ZK proof
        return proof.length > 0 && globalIdentityCommitment[user] != bytes32(0);
    }
    
    /**
     * @notice Get identity commitment for user and event
     */
    function getIdentityCommitment(address user, uint256 eventId) external view returns (bytes32) {
        return identities[user][eventId].commitment;
    }
    
    /**
     * @notice Check if user has verified identity for event
     */
    function isIdentityVerified(address user, uint256 eventId) external view returns (bool) {
        return identities[user][eventId].verified;
    }
    
    /**
     * @notice Get full identity info
     */
    function getIdentity(address user, uint256 eventId) external view returns (Identity memory) {
        return identities[user][eventId];
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Verify World ID proof (mock implementation)
     * @dev In production, this would call World ID's verifyProof function
     */
    function _verifyWorldIdProof(
        address user,
        uint256 eventId,
        bytes calldata proof
    ) internal view returns (bool success, bytes32 nullifierHash) {
        // Mock implementation for testnet
        // Real implementation would decode proof and verify with World ID
        
        if (proof.length == 0) {
            return (false, bytes32(0));
        }
        
        // Generate nullifier from proof (mock)
        nullifierHash = keccak256(abi.encodePacked(user, eventId, proof));
        
        // In production, call World ID router:
        // IWorldID(worldIdRouter).verifyProof(
        //     root,
        //     groupId,
        //     abi.encodePacked(user).hashToField(),
        //     nullifierHash,
        //     abi.encodePacked(eventId).hashToField(),
        //     proof
        // );
        
        return (true, nullifierHash);
    }
    
    /**
     * @notice Verify identity transfer proof (for ticket resale)
     * @dev Ensures the same identity is transferring the ticket
     */
    function verifyTransferIdentity(
        address from,
        address to,
        uint256 eventId,
        bytes calldata proof
    ) external view returns (bool) {
        // Check both parties have verified identities
        if (!identities[from][eventId].verified || !identities[to][eventId].verified) {
            return false;
        }
        
        // Additional verification logic for transfer
        // In production, verify ZK proof that 'to' address has valid identity
        
        return true;
    }
}
