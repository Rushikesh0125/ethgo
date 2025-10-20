// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title ERC-1155 Ticket NFT with predefined tiers and capped supply per tier
/// @author @Rushikesh0125
/// @notice Each tier is represented by a token id; supplies are capped and set at construction. Minting is restricted to a designated minter.
contract TicketNFT is ERC1155 {

    error OnlyMinterCanMint();
    error ZeroAddress();
    error LengthMismatch();
    error NoTiersProvided();
    error ZeroCap();
    error DuplicateTierId();
    error UnknownTier();
    error TierCapReached();
    
	/// @dev Address allowed to mint tickets
	address public immutable minter;

	/// @dev Maximum supply for a given tier id
	mapping(uint256 => uint256) public maxSupplyByTier;

	/// @dev Total minted so far for a given tier id
	mapping(uint256 => uint256) public totalMintedByTier;

	/// @param metadataUri Base URI template, e.g. ipfs://.../{id}.json
	/// @param _minter Address authorized to mint
	/// @param tierIds Array of tier ids that will be enabled
	/// @param maxSupplies Array of max supplies corresponding 1:1 with tierIds
	constructor(
		string memory metadataUri,
		address _minter,
		uint256[] memory tierIds,
		uint256[] memory maxSupplies
	) ERC1155(metadataUri) {
        if (_minter == address(0)) revert ZeroAddress();
        if (tierIds.length != maxSupplies.length) revert LengthMismatch();
        if (tierIds.length == 0) revert NoTiersProvided();
		
		minter = _minter;

		for (uint256 i = 0; i < tierIds.length; i++) {
			uint256 id = tierIds[i];
			uint256 cap = maxSupplies[i];
			if (cap == 0) revert ZeroCap();
			// Prevent duplicate ids in constructor input
			if (maxSupplyByTier[id] != 0) revert DuplicateTierId();
			maxSupplyByTier[id] = cap;
		}
	}

	/// @notice Mint `amount` tickets of tier `id` to `to`
	/// @dev Only the configured minter can mint, and mints cannot exceed the tier cap
	function mint(address to, uint256 id) external {
        if (msg.sender != minter) revert OnlyMinterCanMint();
		if (to == address(0)) revert ZeroAddress();

		uint256 tierCap = maxSupplyByTier[id];
		if (tierCap == 0) revert UnknownTier();

		uint256 mintedSoFar = totalMintedByTier[id];
		if (mintedSoFar >= tierCap) revert TierCapReached();
		totalMintedByTier[id] = mintedSoFar + 1;

		_mint(to, id, 1, "");
	}

    function uri(uint256 _tokenid) override public pure returns (string memory) {
        return string(
            abi.encodePacked(
                "https://ipfs.io/ipfs/bafybeihjjkwdrxxjnuwevlqtqmh3iegcadc32sio4wmo7bv2gbf34qs34a/",
                Strings.toString(_tokenid),".json"
            )
        );
    }
}