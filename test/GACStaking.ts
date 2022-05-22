// eslint-disable-next-line @typescript-eslint/no-var-requires
const truffleAssert = require('truffle-assertions');

const ERC721 = artifacts.require('MockERC721');
const GACStaking = artifacts.require('GACStaking');
const MockFxStateSender = artifacts.require('MockFxStateSender');

enum ErrorMessage {
    NotOwnerOrDev = 'Ownable: caller is not the owner or developer',
    StakingPaused = 'Staking paused',
    NotOwnedByUser = 'Not owned',
}

contract('GACStaking', (accounts) => {
    const getInstance = async (txDetails: Truffle.TransactionDetails) => {
        const devAddress = accounts[9];

        const checkpointManager = web3.eth.accounts.create().address;
        const fxRoot = await MockFxStateSender.new(txDetails);

        const GamingApeClubInstance = await ERC721.new('Mock', 'MK', txDetails);

        const GACStakingInstance = await GACStaking.new(
            checkpointManager,
            fxRoot.address,
            devAddress,
            GamingApeClubInstance.address,
            txDetails
        );

        return {
            GACStakingInstance,
            devAddress,
            checkpointManager,
            fxRoot,
            GamingApeClubInstance,
        };
    };

    it('constructs', async () => {
        const {
            GACStakingInstance,
            GamingApeClubInstance,
            fxRoot,
            checkpointManager,
        } = await getInstance({ from: accounts[0] });

        assert.equal(
            await GACStakingInstance.gacToken(),
            GamingApeClubInstance.address
        );

        assert.equal(await GACStakingInstance.stakingPaused(), false);
        assert.equal(await GACStakingInstance.fxRoot(), fxRoot.address);
        assert.equal(
            await GACStakingInstance.checkpointManager(),
            checkpointManager
        );
    });

    it('fails to stake when staking is paused', async () => {
        const { GACStakingInstance, GamingApeClubInstance } = await getInstance(
            { from: accounts[0] }
        );

        await GamingApeClubInstance.mint(accounts[1], [1, 2, 3]);
        await GACStakingInstance.setStakingPaused(true);

        await GamingApeClubInstance.setApprovalForAll(
            GACStakingInstance.address,
            true,
            { from: accounts[1] }
        );

        await truffleAssert.reverts(
            GACStakingInstance.stake([1, 2, 3], { from: accounts[1] }),
            ErrorMessage.StakingPaused
        );

        await GACStakingInstance.setStakingPaused(false);
        await GACStakingInstance.stake([1, 2, 3], { from: accounts[1] });

        assert.equal(await GACStakingInstance.staked(accounts[1], 1), true);
        assert.equal(await GACStakingInstance.staked(accounts[1], 2), true);
        assert.equal(await GACStakingInstance.staked(accounts[1], 3), true);
        assert.equal(await GACStakingInstance.staked(accounts[1], 4), false);

        assert.equal(
            (await GamingApeClubInstance.balanceOf(accounts[1])).toString(),
            '0'
        );

        assert.equal(
            (
                await GamingApeClubInstance.balanceOf(
                    GACStakingInstance.address
                )
            ).toString(),
            '3'
        );
    });

    it('successfully stakes', async () => {
        const { GACStakingInstance, GamingApeClubInstance } = await getInstance(
            { from: accounts[0] }
        );

        await GamingApeClubInstance.mint(accounts[1], [1, 2, 3]);
        await GamingApeClubInstance.setApprovalForAll(
            GACStakingInstance.address,
            true,
            { from: accounts[1] }
        );
        await GACStakingInstance.stake([1, 2, 3], { from: accounts[1] });

        assert.equal(await GACStakingInstance.staked(accounts[1], 1), true);
        assert.equal(await GACStakingInstance.staked(accounts[1], 2), true);
        assert.equal(await GACStakingInstance.staked(accounts[1], 3), true);
        assert.equal(await GACStakingInstance.staked(accounts[1], 4), false);

        assert.equal(
            (await GamingApeClubInstance.balanceOf(accounts[1])).toString(),
            '0'
        );

        assert.equal(
            (
                await GamingApeClubInstance.balanceOf(
                    GACStakingInstance.address
                )
            ).toString(),
            '3'
        );
    });

    it('fails to unstake when not staked', async () => {
        const { GACStakingInstance } = await getInstance({ from: accounts[0] });

        await truffleAssert.reverts(
            GACStakingInstance.unstake([1], { from: accounts[1] }),
            ErrorMessage.NotOwnedByUser
        );

        await truffleAssert.reverts(
            GACStakingInstance.unstake([2], { from: accounts[1] }),
            ErrorMessage.NotOwnedByUser
        );
    });

    it('fails to unstake when somebody else staked', async () => {
        const { GACStakingInstance, GamingApeClubInstance } = await getInstance(
            { from: accounts[0] }
        );

        await GamingApeClubInstance.mint(accounts[1], [1, 2, 3]);
        await GamingApeClubInstance.setApprovalForAll(
            GACStakingInstance.address,
            true,
            { from: accounts[1] }
        );
        await GACStakingInstance.stake([1, 2, 3], { from: accounts[1] });

        await truffleAssert.reverts(
            GACStakingInstance.unstake([1], { from: accounts[2] }),
            ErrorMessage.NotOwnedByUser
        );
    });

    it('sets staking as paused', async () => {
        const { GACStakingInstance } = await getInstance({ from: accounts[0] });

        await GACStakingInstance.setStakingPaused(true);

        assert.equal(await GACStakingInstance.stakingPaused(), true);

        await GACStakingInstance.setStakingPaused(false);

        assert.equal(await GACStakingInstance.stakingPaused(), false);
    });

    it('fails to set staking as paused when not owner or developer', async () => {
        const { GACStakingInstance } = await getInstance({ from: accounts[0] });

        await truffleAssert.reverts(
            GACStakingInstance.setStakingPaused(true, { from: accounts[1] }),
            ErrorMessage.NotOwnerOrDev
        );
    });

    it('sets fxChildTunnel', async () => {
        const { GACStakingInstance } = await getInstance({ from: accounts[0] });

        await GACStakingInstance.setFxChildTunnel(accounts[1]);

        assert.equal(await GACStakingInstance.fxChildTunnel(), accounts[1]);
    });

    it('fails to set fxChildTunnel when not owner or developer', async () => {
        const { GACStakingInstance } = await getInstance({ from: accounts[0] });

        await truffleAssert.reverts(
            GACStakingInstance.setFxChildTunnel(accounts[1], {
                from: accounts[1],
            }),
            ErrorMessage.NotOwnerOrDev
        );
    });
});

export default {};
