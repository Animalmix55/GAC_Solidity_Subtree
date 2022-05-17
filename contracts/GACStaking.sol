// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./fx-portal/tunnel/FxBaseChildTunnel.sol";
import "./access/DeveloperAccess.sol";
import "./interfaces/IGACXP.sol";

/**
 * The staking contract designated to exist on the Polygon (MATIC) chain,
 * briged via FX-Portal.
 *
 * Author: Cory Cherven (Animalmix55/ToxicPizza)
 */
contract GACStaking is FxBaseChildTunnel, Ownable, DeveloperAccess {
    IGACXP public GACXP;

    struct Reward {
        uint256 amount;
        uint256 nextTier;
    }

    mapping(uint256 => Reward) rewards;

    /**
    * @dev Keeps track of the staking balances for each address.
    */
    mapping(address => uint256) public balances;

    /**
     * @dev keeps track of the last balance calculation.
     */
    mapping(address => uint256) public lastUpdated;

    constructor(address _fxChild, address devAddress, address tokenAddress) FxBaseChildTunnel(_fxChild) DeveloperAccess(devAddress) {

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
     * Sets/updates the address for the root tunnel
     */
    function setFxRootTunnel(address _fxRootTunnel) external override onlyOwnerOrDeveloper {
        fxRootTunnel = _fxRootTunnel;
    }

    // -------------------------------------------- INTERNAL FUNCTIONS ----------------------------------------------

    /**
     * @notice Process message received from FxChild
     * @param stateId unique state id
     * @param sender root message sender
     * @param message bytes message that was sent from Root Tunnel
     */
    function _processMessageFromRoot(
        uint256 stateId,
        address sender,
        bytes memory message
    ) internal override validateSender(sender) {
        (address from, uint256 count, bool action) = abi.decode(
            message,
            (address, uint256, bool)
        );

        // TODO: STUFFS
    }
}
