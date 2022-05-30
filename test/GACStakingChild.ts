/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
/* eslint-disable @typescript-eslint/no-explicit-any */

import BN from 'bn.js';
import { GACStakingChildInstance } from '../types/truffle-contracts';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const truffleAssert = require('truffle-assertions');

const GACStakingChild = artifacts.require('GACStakingChild');
const GACXP = artifacts.require('GACXP');

enum ErrorMessage {
    NotOwnerOrDev = 'Ownable: caller is not the owner or developer',
    LengthMismatch = 'Length mismatch',
    TooFewRewards = 'Too few rewards',
    MustBeginWithOne = 'Must begin with one',
    NotInOrder = 'Not in order',
}

const advanceTime = async (time: number) => {
    return new Promise((resolve, reject) => {
        (web3.currentProvider as any).send(
            {
                jsonrpc: '2.0',
                method: 'evm_increaseTime',
                params: [time],
                id: new Date().getTime(),
            },
            (err1: any, result1: any): void => {
                if (err1) {
                    reject(err1);
                    return;
                }
                (web3.currentProvider as any).send(
                    { jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 },
                    (err2: any) => {
                        if (err2) {
                            reject(err2);
                            return;
                        }
                        resolve(result1);
                    }
                );
            }
        );
    });
};

const initialRewards: Record<number, BN> = {
    1: new BN(web3.utils.toWei('80', 'ether')),
    2: new BN(web3.utils.toWei('90', 'ether')),
    3: new BN(web3.utils.toWei('110', 'ether')),
    4: new BN(web3.utils.toWei('140', 'ether')),
    5: new BN(web3.utils.toWei('180', 'ether')),
    7: new BN(web3.utils.toWei('250', 'ether')),
    10: new BN(web3.utils.toWei('350', 'ether')),
    15: new BN(web3.utils.toWei('460', 'ether')),
    20: new BN(web3.utils.toWei('590', 'ether')),
    25: new BN(web3.utils.toWei('730', 'ether')),
    30: new BN(web3.utils.toWei('880', 'ether')),
    40: new BN(web3.utils.toWei('1090', 'ether')),
    50: new BN(web3.utils.toWei('1310', 'ether')),
    60: new BN(web3.utils.toWei('1540', 'ether')),
    75: new BN(web3.utils.toWei('1835', 'ether')),
    100: new BN(web3.utils.toWei('2235', 'ether')),
};

contract('GACStakingChild', (accounts) => {
    const getInstance = async (txDetails: Truffle.TransactionDetails) => {
        const devAddress = accounts[9];

        const fxChild = txDetails.from ?? accounts[0];
        const fxRootTunnel = txDetails.from ?? accounts[0];
        const GACXPInstance = await GACXP.new(devAddress, txDetails);

        const GACStakingInstance = await GACStakingChild.new(
            fxChild,
            devAddress,
            GACXPInstance.address,
            txDetails
        );
        await GACStakingInstance.setFxRootTunnel(fxRootTunnel);
        await GACXPInstance.transferDevelopership(GACStakingInstance.address, {
            from: devAddress,
        }); // for unlimited minting...

        return {
            GACStakingInstance,
            devAddress,
            fxChild,
            GACXPInstance,
            fxRootTunnel,
        };
    };

    const stake = async (
        instance: GACStakingChildInstance,
        user: string,
        amount: number,
        fxRootTunnel: string,
        txDetails: Truffle.TransactionDetails
    ) => {
        const message = web3.eth.abi.encodeParameters(
            ['address', 'uint256', 'bool'],
            [user, amount, true]
        );
        await instance.processMessageFromRoot(
            1,
            fxRootTunnel,
            message,
            txDetails
        );
    };

    const unstake = async (
        instance: GACStakingChildInstance,
        user: string,
        amount: number,
        fxRootTunnel: string,
        txDetails: Truffle.TransactionDetails
    ) => {
        const message = web3.eth.abi.encodeParameters(
            ['address', 'uint256', 'bool'],
            [user, amount, false]
        );
        await instance.processMessageFromRoot(
            1,
            fxRootTunnel,
            message,
            txDetails
        );
    };

    it('constructs with defaults', async () => {
        const { GACStakingInstance } = await getInstance({
            from: accounts[0],
        });

        console.log('Loading default rewards...');
        const { 0: amounts, 1: rewards } = await GACStakingInstance.dumpRewards(
            {
                from: accounts[0],
            }
        );

        const expectedCount = Object.keys(initialRewards).length;
        assert.equal(amounts.length, expectedCount);

        amounts.forEach((amount, index) => {
            const expectedReward = initialRewards[amount.toNumber()];
            console.log(
                `Amount - ${amount.toString()}, Reward - ${web3.utils.fromWei(
                    rewards[index].toString(),
                    'ether'
                )}`
            );
            assert.equal(rewards[index].toString(), expectedReward.toString());
        });
    });

    it('allows the owner to set the fxRootTunnel', async () => {
        const { GACStakingInstance } = await getInstance({
            from: accounts[0],
        });

        const fxRootTunnel = accounts[1];
        await GACStakingInstance.setFxRootTunnel(fxRootTunnel, {
            from: accounts[0],
        });

        const fxRootTunnelAddress = await GACStakingInstance.fxRootTunnel();
        assert.equal(fxRootTunnelAddress, fxRootTunnel);
    });

    const updatedRewards: Record<number, BN> = {
        1: new BN(web3.utils.toWei('800', 'ether')),
        2: new BN(web3.utils.toWei('900', 'ether')),
        3: new BN(web3.utils.toWei('1100', 'ether')),
        4: new BN(web3.utils.toWei('1400', 'ether')),
        5: new BN(web3.utils.toWei('1800', 'ether')),
        7: new BN(web3.utils.toWei('2500', 'ether')),
        10: new BN(web3.utils.toWei('3500', 'ether')),
        15: new BN(web3.utils.toWei('4600', 'ether')),
        20: new BN(web3.utils.toWei('5900', 'ether')),
        25: new BN(web3.utils.toWei('7300', 'ether')),
        30: new BN(web3.utils.toWei('8800', 'ether')),
        40: new BN(web3.utils.toWei('10900', 'ether')),
        50: new BN(web3.utils.toWei('13100', 'ether')),
        60: new BN(web3.utils.toWei('15400', 'ether')),
        75: new BN(web3.utils.toWei('18350', 'ether')),
        100: new BN(web3.utils.toWei('22350', 'ether')),
    };

    const newAmounts = Object.keys(updatedRewards) as unknown as number[];
    const newRewards = newAmounts.map((amount) => updatedRewards[amount]);

    it('allows updating rewards', async () => {
        const { GACStakingInstance } = await getInstance({
            from: accounts[0],
        });

        await GACStakingInstance.setRewards(newAmounts, newRewards, {
            from: accounts[0],
        });

        const { 0: amounts, 1: rewards } = await GACStakingInstance.dumpRewards(
            {
                from: accounts[0],
            }
        );

        assert.equal(amounts.length, newAmounts.length);

        newAmounts.forEach((expectedAmount, index) => {
            const expectedReward = newRewards[index];
            assert.equal(rewards[index].toString(), expectedReward.toString());
            assert.equal(amounts[index].toString(), expectedAmount.toString());
        });
    });

    it('fails to update rewards if they do not start from 1', async () => {
        const { GACStakingInstance } = await getInstance({
            from: accounts[0],
        });

        await truffleAssert.reverts(
            GACStakingInstance.setRewards([0, 1, 2, 3], [1, 2, 3, 4], {
                from: accounts[0],
            }),
            ErrorMessage.MustBeginWithOne
        );
    });

    it('fails to update rewards if tiers are not in increasing order', async () => {
        const { GACStakingInstance } = await getInstance({
            from: accounts[0],
        });

        await truffleAssert.reverts(
            GACStakingInstance.setRewards([1, 3, 2], [1, 2, 3], {
                from: accounts[0],
            }),
            ErrorMessage.NotInOrder
        );
    });

    it('fails to update rewards if the arrays are of different sizes', async () => {
        const { GACStakingInstance } = await getInstance({
            from: accounts[0],
        });

        await truffleAssert.reverts(
            GACStakingInstance.setRewards([1, 2], [1, 2, 3], {
                from: accounts[0],
            }),
            ErrorMessage.LengthMismatch
        );
    });

    it('fails to update rewards if the user is not an owner or developer', async () => {
        const { GACStakingInstance } = await getInstance({
            from: accounts[0],
        });

        await truffleAssert.reverts(
            GACStakingInstance.setRewards([1, 2, 3], [1, 2, 3], {
                from: accounts[1],
            }),
            ErrorMessage.NotOwnerOrDev
        );
    });

    it('allows staking', async () => {
        const { GACStakingInstance, fxRootTunnel } = await getInstance({
            from: accounts[0],
        });

        const user = accounts[1];
        const amount = 10;
        await stake(GACStakingInstance, user, amount, fxRootTunnel, {
            from: accounts[0],
        });

        const { 0: balance } = await GACStakingInstance.stakes(user);
        assert.equal(balance.toString(), amount.toString());
    });

    it('fails to unstake if the user has not staked', async () => {
        const { GACStakingInstance, fxRootTunnel } = await getInstance({
            from: accounts[0],
        });

        const user = accounts[1];
        const amount = 10;
        const message = web3.eth.abi.encodeParameters(
            ['address', 'uint256', 'bool'],
            [user, amount, false]
        );
        await truffleAssert.fails(
            GACStakingInstance.processMessageFromRoot(
                1,
                fxRootTunnel,
                message,
                { from: accounts[0] }
            )
        );
    });

    it('allows unstaking', async () => {
        const { GACStakingInstance, fxRootTunnel } = await getInstance({
            from: accounts[0],
        });

        const user = accounts[1];
        const amount = 10;
        await stake(GACStakingInstance, user, amount, fxRootTunnel, {
            from: accounts[0],
        });

        let { 0: balance } = await GACStakingInstance.stakes(user);
        assert.equal(balance.toString(), String(amount));

        await unstake(GACStakingInstance, user, amount, fxRootTunnel, {
            from: accounts[0],
        });

        ({ 0: balance } = await GACStakingInstance.stakes(user));
        assert.equal(balance.toString(), '0');
    });

    it('the user gets the appropriate rewards at the right times', async () => {
        const { GACStakingInstance, fxRootTunnel } = await getInstance({
            from: accounts[0],
        });

        const user = accounts[1];
        const amount = 10;
        await stake(GACStakingInstance, user, amount, fxRootTunnel, {
            from: accounts[0],
        });

        const { 0: balance } = await GACStakingInstance.stakes(user);
        assert.equal(balance.toString(), String(amount));

        let reward = await GACStakingInstance.getReward(user);
        assert.equal(reward.toString(), '0');

        await advanceTime(60 * 60 * 24 - 1000); // one day has passed, minus a bit

        reward = await GACStakingInstance.getReward(user);
        assert.equal(reward.toString(), '0');

        await advanceTime(2000); // over one day has passed

        reward = await GACStakingInstance.getReward(user);
        assert.equal(reward.toString(), web3.utils.toWei('1280'));
    });

    it('the user can claim rewards', async () => {
        const { GACStakingInstance, fxRootTunnel, GACXPInstance } =
            await getInstance({
                from: accounts[0],
            });

        const user = accounts[1];
        const amount = 10;
        await stake(GACStakingInstance, user, amount, fxRootTunnel, {
            from: accounts[0],
        });

        await advanceTime(60 * 60 * 24 + 1000); // one day has passed, plus a bit

        let reward = await GACStakingInstance.getReward(user);
        assert.equal(reward.toString(), web3.utils.toWei('1280'));

        await GACStakingInstance.claimReward({ from: user });

        reward = await GACStakingInstance.getReward(user);
        assert.equal(reward.toString(), '0');

        const tokenBalance = await GACXPInstance.balanceOf(user);
        assert.equal(tokenBalance.toString(), web3.utils.toWei('1280'));
    });

    it('the bonus only applies once', async () => {
        const { GACStakingInstance, fxRootTunnel, GACXPInstance } =
            await getInstance({
                from: accounts[0],
            });

        const user = accounts[1];
        const amount = 10;
        await stake(GACStakingInstance, user, amount, fxRootTunnel, {
            from: accounts[0],
        });

        await advanceTime(60 * 60 * 24 + 1000); // one day has passed, plus a bit

        let reward = await GACStakingInstance.getReward(user);
        assert.equal(reward.toString(), web3.utils.toWei('1280'));

        await GACStakingInstance.claimReward({ from: user });

        reward = await GACStakingInstance.getReward(user);
        assert.equal(reward.toString(), '0');

        let tokenBalance = await GACXPInstance.balanceOf(user);
        assert.equal(tokenBalance.toString(), web3.utils.toWei('1280'));

        await advanceTime(60 * 60 * 24 + 1000); // one day has passed, plus a bit

        reward = await GACStakingInstance.getReward(user);
        assert.equal(reward.toString(), web3.utils.toWei('1200'));

        await GACStakingInstance.claimReward({ from: user });

        reward = await GACStakingInstance.getReward(user);
        assert.equal(reward.toString(), '0');

        tokenBalance = await GACXPInstance.balanceOf(user);
        assert.equal(
            tokenBalance.toString(),
            web3.utils.toWei(String(1280 + 1200))
        );
    });

    it('rewards are claimed by unstaking', async () => {
        const { GACStakingInstance, fxRootTunnel, GACXPInstance } =
            await getInstance({
                from: accounts[0],
            });

        const user = accounts[1];
        const amount = 10;
        await stake(GACStakingInstance, user, amount, fxRootTunnel, {
            from: accounts[0],
        });

        await advanceTime(60 * 60 * 24 + 1000); // one day has passed, plus a bit

        let reward = await GACStakingInstance.getReward(user);
        assert.equal(reward.toString(), web3.utils.toWei('1280'));

        await unstake(GACStakingInstance, user, amount, fxRootTunnel, {
            from: accounts[0],
        });

        reward = await GACStakingInstance.getReward(user);
        assert.equal(reward.toString(), '0');

        const tokenBalance = await GACXPInstance.balanceOf(user);
        assert.equal(tokenBalance.toString(), web3.utils.toWei('1280'));
    });

    it('rewards are claimed by staking more', async () => {
        const { GACStakingInstance, fxRootTunnel, GACXPInstance } =
            await getInstance({
                from: accounts[0],
            });

        const user = accounts[1];
        const amount = 10;
        await stake(GACStakingInstance, user, amount, fxRootTunnel, {
            from: accounts[0],
        });

        await advanceTime(60 * 60 * 24 + 1000); // one day has passed, plus a bit

        let reward = await GACStakingInstance.getReward(user);
        assert.equal(reward.toString(), web3.utils.toWei('1280'));

        await stake(GACStakingInstance, user, amount, fxRootTunnel, {
            from: accounts[0],
        });

        reward = await GACStakingInstance.getReward(user);
        assert.equal(reward.toString(), '0');

        const tokenBalance = await GACXPInstance.balanceOf(user);
        assert.equal(tokenBalance.toString(), web3.utils.toWei('1280'));

        assert.equal(
            (await GACStakingInstance.stakes(user))[0].toString(),
            String(amount * 2)
        );
    });

    it('allows the owner/dev to manually set stakes should there be an error', async () => {
        const { GACStakingInstance, GACXPInstance, fxRootTunnel } =
            await getInstance({
                from: accounts[0],
            });

        // accounts[1] stakes 10
        await stake(GACStakingInstance, accounts[1], 10, fxRootTunnel, {
            from: accounts[0],
        });

        await advanceTime(60 * 60 * 24 + 1000); // one day has passed, plus a bit
        let reward = await GACStakingInstance.getReward(accounts[1]);
        assert.equal(reward.toString(), web3.utils.toWei('1280'));

        // fails if not owner/dev
        await truffleAssert.reverts(
            GACStakingInstance.manuallyUpdateBulkStakes(
                [accounts[0], accounts[1]],
                [11, 11]
            ),
            ErrorMessage.NotOwnerOrDev
        );

        await GACStakingInstance.manuallyUpdateBulkStakes(
            [accounts[0], accounts[1]],
            [11, 11]
        );

        reward = await GACStakingInstance.getReward(accounts[1]);
        assert.equal(reward.toString(), web3.utils.toWei('0'));

        const tokenBalance = await GACXPInstance.balanceOf(accounts[1]);
        assert.equal(tokenBalance.toString(), web3.utils.toWei('1280'));

        assert.equal(
            (await GACStakingInstance.stakes(accounts[1]))[0].toString(),
            '11'
        );
        assert.equal(
            (await GACStakingInstance.stakes(accounts[0]))[0].toString(),
            '11'
        );
    });
});

export default {};
