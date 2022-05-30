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
    uint256 public firstTimeBonus = 80000000000000000000;

    struct Reward {
        uint128 amount;
        uint128 nextTier;
    }

    struct Stake {
        uint128 amount;
        uint120 lastUpdated;
        bool hasClaimed;
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

        // configure default reward scheme
        uint128[] memory amounts = new uint128[](16);
        uint128[] memory newRewards = new uint128[](16);

        amounts[0] = 1;
        newRewards[0] = 80000000000000000000;

        amounts[1] = 2;
        newRewards[1] = 90000000000000000000;

        amounts[2] = 3;
        newRewards[2] = 110000000000000000000;

        amounts[3] = 4;
        newRewards[3] = 140000000000000000000;

        amounts[4] = 5;
        newRewards[4] = 180000000000000000000;

        amounts[5] = 7;
        newRewards[5] = 250000000000000000000;

        amounts[6] = 10;
        newRewards[6] = 350000000000000000000;

        amounts[7] = 15;
        newRewards[7] = 460000000000000000000;

        amounts[8] = 20;
        newRewards[8] = 590000000000000000000;

        amounts[9] = 25;
        newRewards[9] = 730000000000000000000;

        amounts[10] = 30;
        newRewards[10] = 880000000000000000000;

        amounts[11] = 40;
        newRewards[11] = 1090000000000000000000;

        amounts[12] = 50;
        newRewards[12] = 1310000000000000000000;

        amounts[13] = 60;
        newRewards[13] = 1540000000000000000000;

        amounts[14] = 75;
        newRewards[14] = 1835000000000000000000;

        amounts[15] = 100;
        newRewards[15] = 2235000000000000000000;

        setRewards(amounts, newRewards);
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
     * A manual override functionality to allow an admit to update a user's stake.
     * @param user - the user whose stake is being updated.
     * @param amount - the amount to set the user's stake to.
     * @dev this will claim any existing rewards and reset timers.
     */
    function manuallyUpdateStake(address user, uint128 amount)
        public
        onlyOwnerOrDeveloper
    {
        _manuallyUpdateStake(user, amount);
    }

    /**
     * A manual override functionality to allow an admit to update many users' stakes.
     * @param users - the users whose stakes are being updated.
     * @param amounts - the amounts to set the associated user's stake to.
     * @dev this will claim any existing rewards and reset timers.
     */
    function manuallyUpdateBulkStakes(
        address[] calldata users,
        uint128[] calldata amounts
    ) external onlyOwnerOrDeveloper {
        for (uint256 i = 0; i < users.length; i++) {
            _manuallyUpdateStake(users[i], amounts[i]);
        }
    }

    /**
     * Sets/updates the bonus for claiming for the first time.
     * @param _bonus - the new bonus
     */
    function setFirstTimeBonus(uint256 _bonus) external onlyOwnerOrDeveloper {
        firstTimeBonus = _bonus;
    }

    /**
     * Resets the reward calculation schema.
     * @param amounts - a list of held amounts in increasing order.
     * @param newRewards - a parallel list to amounts containing the summative yields per period for the respective amount.
     */
    function setRewards(uint128[] memory amounts, uint128[] memory newRewards)
        public
        onlyOwnerOrDeveloper
    {
        require(amounts.length == newRewards.length, "Length mismatch");
        require(amounts.length > 0, "Too few rewards");
        require(amounts[0] == 1, "Must begin with one");

        uint128 lastAmount;
        for (uint256 i; i < amounts.length; i++) {
            require(amounts[i] > lastAmount, "Not in order");
            lastAmount = amounts[i];

            Reward memory currentReward;
            currentReward.amount = newRewards[i];
            if (amounts.length > i + 1) currentReward.nextTier = amounts[i + 1];

            rewards[amounts[i]] = currentReward;
        }
    }

    // ---------------------------------------------- PUBLIC FUNCTIONS -----------------------------------------------

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

    /**
     * Tricks collab.land and other ERC721 balance checkers into believing that the user has a balance.
     * @dev a duplicate stakes(user).amount.
     * @param user - the user to get the balance of.
     */
    function balanceOf(address user) external view returns (uint256) {
        return stakes[user].amount;
    }

    /**
     * Dumps the rewards currently programmed in per tier as two parallel arrays
     * defining (amount, yield) pairs.
     *
     * @return (uint128[] holdingAmounts, uint128[] rewardAmounts)
     */
    function dumpRewards()
        external
        view
        returns (uint128[] memory, uint128[] memory)
    {
        uint128 numTiers = _countRewardsTiers();

        uint128[] memory holdingAmounts = new uint128[](numTiers);
        uint128[] memory rewardAmounts = new uint128[](numTiers);

        uint128 nextTier = 1;
        uint128 index = 0;

        while (nextTier != 0) {
            holdingAmounts[index] = nextTier;
            rewardAmounts[index] = rewards[nextTier].amount;

            nextTier = rewards[nextTier].nextTier;
            index++;
        }

        return (holdingAmounts, rewardAmounts);
    }

    // -------------------------------------------- INTERNAL FUNCTIONS ----------------------------------------------

    /**
     * Counts the number of rewards tiers in the linked list starting at 1.
     */
    function _countRewardsTiers() internal view returns (uint128) {
        uint128 count = 0;
        uint128 nextTier = 1;

        while (nextTier != 0) {
            count++;
            nextTier = rewards[nextTier].nextTier;
        }

        return count;
    }

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
     * A manual override functionality to allow an admit to update a user's stake.
     * @param user - the user whose stake is being updated.
     * @param amount - the amount to set the user's stake to.
     * @dev this will claim any existing rewards and reset timers.
     */
    function _manuallyUpdateStake(address user, uint128 amount) internal {
        _updateBalance(user);

        stakes[user].amount = amount;
    }

    /**
     * To be called on stake/unstake, evaluates the user's current balance
     * and resets any timers.
     * @param user - the user to update for.
     */
    function _updateBalance(address user) internal {
        Stake storage stake = stakes[user];

        uint256 reward = _currentReward(stake);
        stake.lastUpdated = uint120(block.timestamp);

        if (reward > 0) {
            if (!stake.hasClaimed) stake.hasClaimed = true;
            GACXP.mint(reward, user);
        }
    }

    /**
     * Calculates the current pending reward based on the inputted stake struct.
     * @param stake - the stake for the user to calculate upon.
     */
    function _currentReward(Stake memory stake)
        internal
        view
        returns (uint256)
    {
        uint256 periodicYield = _calculateReward(stake.amount);
        uint256 periodsPassed = (block.timestamp - stake.lastUpdated) /
            YIELD_PERIOD;

        uint256 reward = periodicYield * periodsPassed;
        if (reward != 0 && !stake.hasClaimed) reward += firstTimeBonus;

        return reward;
    }

    /**
     * Evaluates the current reward for having staked the given amount of tokens.
     * @param amount - the amount of tokens staked.
     * @return reward - the dividend per day.
     */
    function _calculateReward(uint128 amount) internal view returns (uint256) {
        if (amount == 0) return 0;

        uint256 reward;
        uint128 next = 1;

        do {
            Reward memory currentReward = rewards[next];
            reward += currentReward.amount;
            next = currentReward.nextTier;
        } while (next != 0 && next <= amount);

        return reward;
    }
}
