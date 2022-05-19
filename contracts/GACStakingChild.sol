// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

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
contract GACStakingChild is FxBaseChildTunnel, Ownable, DeveloperAccess {
    uint256 constant YIELD_PERIOD = 1 days;

    IGACXP public GACXP;

    struct Reward {
        uint128 amount;
        uint128 nextTier;
    }

    struct Stake {
        uint128 amount;
        uint128 lastUpdated;
    }

    /**
     * A linked list of reward tiers based on holdings
     */
    mapping(uint128 => Reward) public rewards;

    /**
     * Users' stakes mapped from their address
     */
    mapping(address => Stake) public stakes;

    constructor(
        address fxChild,
        address devAddress,
        address tokenAddress
    ) FxBaseChildTunnel(fxChild) DeveloperAccess(devAddress) {
        GACXP = IGACXP(tokenAddress);
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
     * @param _fxRootTunnel - the fxRootTunnel address
     */
    function setFxRootTunnel(address _fxRootTunnel)
        external
        override
        onlyOwnerOrDeveloper
    {
        fxRootTunnel = _fxRootTunnel;
    }

    /**
     * Claims the pending reward for the transaction sender.
     */
    function claimReward() external {
        _updateBalance(msg.sender);
    }

    /**
     * Gets the pending reward for the provided user.
     * @param user - the user whose reward is being sought.
     */
    function getReward(address user) external view returns (uint256) {
        return _currentReward(stakes[user]);
    }

    // -------------------------------------------- INTERNAL FUNCTIONS ----------------------------------------------

    /**
     * @notice Process message received from FxChild
     * @param sender root message sender
     * @param message bytes message that was sent from Root Tunnel
     */
    function _processMessageFromRoot(
        uint256,
        address sender,
        bytes memory message
    ) internal override validateSender(sender) {
        (address from, uint256 count, bool isInbound) = abi.decode(
            message,
            (address, uint256, bool)
        );

        if (isInbound) _stake(from, uint128(count));
        else _unstake(from, uint128(count));
    }

    /**
     * Updates the stake to represent new tokens, starts over the current period.
     */
    function _stake(address user, uint128 amount) internal {
        _updateBalance(user);

        stakes[user].amount += amount;
    }

    /**
     * Updates the stake to represent new tokens, starts over the current period.
     */
    function _unstake(address user, uint128 amount) internal {
        _updateBalance(user);

        stakes[user].amount -= amount;
    }

    /**
     * To be called on stake/unstake, evaluates the user's current balance
     * and resets any timers.
     * @param user - the user to update for.
     */
    function _updateBalance(address user) internal {
        Stake storage stake = stakes[user];
        
        uint256 reward = _currentReward(stake);
        stake.lastUpdated = uint128(block.timestamp);

        if(reward > 0) GACXP.mint(reward, user);
    }

    /**
     * Calculates the current pending reward based on the inputted stake struct.
     * @param stake - the stake for the user to calculate upon.
     */
    function _currentReward(Stake memory stake) internal view returns (uint256) {
        uint256 periodicYield = _calculateReward(stake.amount);
        uint256 periodsPassed = (block.timestamp - stake.lastUpdated) / YIELD_PERIOD;

        uint256 reward = periodicYield * periodsPassed;
        return reward;
    }

    /**
     * Evaluates the current reward for having staked the given amount of tokens.
     * @param amount - the amount of tokens staked.
     * @return reward - the dividend per day.
     */
    function _calculateReward(uint128 amount)
        internal
        view
        returns (uint256)
    {
        if (amount == 0) return 0;

        uint256 reward;
        uint128 next = 1;

        do {
            Reward memory currentReward = rewards[next];
            reward += currentReward.amount;
            next = currentReward.nextTier;
        } while (next != 0 && next >= amount);

        return reward;
    }
}
