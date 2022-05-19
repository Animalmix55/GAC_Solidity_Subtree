// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "./fx-portal/tunnel/FxBaseRootTunnel.sol";
import "./access/DeveloperAccess.sol";

/**
 * The staking contract designated to exist on the Ethereum chain,
 * briged to Polygon (MATIC) via FX-Portal.
 *
 * Author: Cory Cherven (Animalmix55/ToxicPizza)
 */
contract GACStaking is FxBaseRootTunnel, Ownable, DeveloperAccess {
    IERC721Metadata public gacToken;
    bool public stakingPaused;

    /**
     * Users' staked tokens mapped from their address
     */
    mapping(address => mapping(uint256 => bool)) public staked;

    constructor(
        address checkpointManager,
        address fxRoot,
        address devAddress,
        address tokenAddress
    ) FxBaseRootTunnel(checkpointManager, fxRoot) DeveloperAccess(devAddress) {
        gacToken = IERC721Metadata(tokenAddress);
    }

    // ----------------------------------------------- PUBLIC FUNCTIONS ----------------------------------------------

    /**
     * Stakes the given token ids, provided the contract is approved to move them.
     * @param tokenIds - the token ids to stake
     */
    function stake(uint256[] calldata tokenIds) external {
        require(!stakingPaused, "Staking paused");
        for (uint256 i; i < tokenIds.length; i++) {
            gacToken.transferFrom(msg.sender, address(this), tokenIds[i]);
            staked[msg.sender][tokenIds[i]] = true;
        }

        _informChildOfEvent(msg.sender, tokenIds.length, true);
    }

    /**
     * Unstakes the given token ids.
     * @param tokenIds - the token ids to unstake
     */
    function unstake(uint256[] calldata tokenIds) external {
        for (uint256 i; i < tokenIds.length; i++) {
            require(staked[msg.sender][tokenIds[i]], "Not allowed");
            gacToken.transferFrom(address(this), msg.sender, tokenIds[i]);
            staked[msg.sender][tokenIds[i]] = false;
        }

        _informChildOfEvent(msg.sender, tokenIds.length, false);
    }

    // -------------------------------------------- ADMIN FUNCTIONS --------------------------------------------------

    /**
     * @dev Throws if called by any account other than the developer/owner.
     */
    modifier onlyOwnerOrDeveloper() {
        require(
            developer() == _msgSender() || owner() == _msgSender(),
            "Ownable: caller is not the owner or developer"
        );
        _;
    }

    /**
     * Updates the paused state of staking.
     * @param paused - the state's new value.
     */
    function setStakingPaused(bool paused) external onlyOwnerOrDeveloper {
        stakingPaused = paused;
    }

    /**
     * Allows permissioned setting of fxChildTunnel
     * @param _fxChildTunnel - the fxChildTunnel address
     */
    function setFxChildTunnel(address _fxChildTunnel) public override onlyOwnerOrDeveloper {
        fxChildTunnel = _fxChildTunnel;
    }

    // -------------------------------------------- INTERNAL FUNCTIONS ----------------------------------------------

    /**
     * Informs the child contract, via FX-Portal, that a staking event has occurred.
     * @param from - the user that staked/unstaked
     * @param count - the number staked/unstaked
     * @param isInbound - true if staking, false if unstaking
     */
    function _informChildOfEvent(
        address from,
        uint256 count,
        bool isInbound
    ) internal {
        _sendMessageToChild(abi.encode(from, count, isInbound));
    }

    /**
     * A stub that does nothing. We will not anticipate receiving messages from Polygon,
     * we will only send messages to Polygon via FX-Portal.
     */
    function _processMessageFromChild(bytes memory) internal override {}
}
