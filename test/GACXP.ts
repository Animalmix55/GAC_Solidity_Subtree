// eslint-disable-next-line @typescript-eslint/no-var-requires
const truffleAssert = require('truffle-assertions');

const GACXP = artifacts.require('GACXP');

enum ErrorMessage {
    NotOwnerOrDev = 'Ownable: caller is not the owner or developer',
    MintingPaused = 'Minting paused',
    LengthMismatch = 'Length mismatch',
}

contract('GACXP', (accounts) => {
    const getInstance = async (txDetails: Truffle.TransactionDetails) => {
        const devAddress = accounts[9];
        const GACXPInstance = await GACXP.new(devAddress, txDetails);

        return { GACXPInstance, devAddress };
    };

    it('constructs', async () => {
        const { GACXPInstance } = await getInstance({ from: accounts[0] });

        assert.equal((await GACXPInstance.totalSupply()).toString(), '0');
    });

    it('updates mint allowance', async () => {
        const { GACXPInstance } = await getInstance({ from: accounts[0] });
        await GACXPInstance.updateMintAllowance(accounts[1], 100);

        assert.equal(
            (await GACXPInstance.getMintAllowance(accounts[1])).toString(),
            '100'
        );

        await GACXPInstance.updateMintAllowance(accounts[1], 0);

        assert.equal(
            (await GACXPInstance.getMintAllowance(accounts[1])).toString(),
            '0'
        );
    });

    it('sets minting paused', async () => {
        const { GACXPInstance } = await getInstance({ from: accounts[0] });

        await GACXPInstance.setMintingPaused(true);
        assert.equal(await GACXPInstance.mintingPaused(), true);

        await GACXPInstance.setMintingPaused(false);
        assert.equal(await GACXPInstance.mintingPaused(), false);
    });

    it('fails to mint when paused', async () => {
        const { GACXPInstance } = await getInstance({ from: accounts[0] });

        await GACXPInstance.updateMintAllowance(accounts[1], 1000);
        await GACXPInstance.setMintingPaused(true);

        await truffleAssert.reverts(
            GACXPInstance.mint(1000, accounts[1], { from: accounts[1] }),
            ErrorMessage.MintingPaused
        );

        await GACXPInstance.setMintingPaused(false);
        await GACXPInstance.mint(1000, accounts[1], { from: accounts[1] });

        assert.equal((await GACXPInstance.totalSupply()).toString(), '1000');
    });

    it('allows minting for developers and owners when paused', async () => {
        const { GACXPInstance, devAddress } = await getInstance({
            from: accounts[0],
        });

        await GACXPInstance.setMintingPaused(true);

        await GACXPInstance.mint(1000, devAddress, { from: devAddress });
        assert.equal((await GACXPInstance.totalSupply()).toString(), '1000');

        await GACXPInstance.mint(1000, accounts[0], { from: devAddress });
        assert.equal((await GACXPInstance.totalSupply()).toString(), '2000');
    });

    it('fails to mint due to insufficient allowance', async () => {
        const { GACXPInstance } = await getInstance({ from: accounts[0] });

        await truffleAssert.fails(
            GACXPInstance.mint(1000, accounts[1], { from: accounts[1] })
        );
    });

    it('mints', async () => {
        const { GACXPInstance } = await getInstance({ from: accounts[0] });

        await GACXPInstance.updateMintAllowance(accounts[1], 1000);
        await GACXPInstance.mint(1000, accounts[1], { from: accounts[1] });

        assert.equal((await GACXPInstance.totalSupply()).toString(), '1000');
        assert.equal(
            (await GACXPInstance.getMintAllowance(accounts[1])).toString(),
            '0'
        );
    });

    it('failes to bulk mint while paused', async () => {
        const { GACXPInstance } = await getInstance({ from: accounts[0] });

        await GACXPInstance.setMintingPaused(true);
        await GACXPInstance.updateMintAllowance(accounts[1], 3000);

        await truffleAssert.reverts(
            GACXPInstance.bulkMint([1000, 2000], [accounts[1], accounts[2]], {
                from: accounts[1],
            }),
            ErrorMessage.MintingPaused
        );

        await GACXPInstance.setMintingPaused(false);
        await GACXPInstance.bulkMint([1000, 2000], [accounts[1], accounts[2]], {
            from: accounts[1],
        });

        assert.equal((await GACXPInstance.totalSupply()).toString(), '3000');
    });

    it('allows bulk minting for developers and owners while paused', async () => {
        const { GACXPInstance, devAddress } = await getInstance({
            from: accounts[0],
        });

        await GACXPInstance.setMintingPaused(true);

        await GACXPInstance.bulkMint([1000, 2000], [accounts[1], accounts[2]], {
            from: devAddress,
        });
        assert.equal((await GACXPInstance.totalSupply()).toString(), '3000');

        await GACXPInstance.bulkMint([1000, 2000], [accounts[1], accounts[2]], {
            from: accounts[0],
        });
        assert.equal((await GACXPInstance.totalSupply()).toString(), '6000');
    });

    it('fails to bulk mint due to insufficient allowance', async () => {
        const { GACXPInstance } = await getInstance({ from: accounts[0] });

        await GACXPInstance.updateMintAllowance(accounts[1], 3000);

        await truffleAssert.fails(
            GACXPInstance.bulkMint([1001, 2000], [accounts[1], accounts[2]], {
                from: accounts[1],
            })
        );
    });

    it('bulk mints', async () => {
        const { GACXPInstance } = await getInstance({ from: accounts[0] });

        await GACXPInstance.updateMintAllowance(accounts[1], 3000);
        await GACXPInstance.bulkMint([1000, 2000], [accounts[1], accounts[2]], {
            from: accounts[1],
        });

        assert.equal((await GACXPInstance.totalSupply()).toString(), '3000');
        assert.equal(
            (await GACXPInstance.getMintAllowance(accounts[1])).toString(),
            '0'
        );
    });

    it('fails to burn when not allowed', async () => {
        const { GACXPInstance } = await getInstance({ from: accounts[0] });

        await GACXPInstance.mint(1000, accounts[1], { from: accounts[0] });

        await truffleAssert.fails(
            GACXPInstance.burn(accounts[1], 1000, { from: accounts[2] })
        );
    });

    it('allows burning ones own tokens', async () => {
        const { GACXPInstance } = await getInstance({ from: accounts[0] });

        await GACXPInstance.mint(1000, accounts[1], { from: accounts[0] });
        await GACXPInstance.burn(accounts[1], 1000, { from: accounts[1] });

        assert.equal((await GACXPInstance.totalSupply()).toString(), '0');
    });

    it('allows burning tokens for which a user is approved', async () => {
        const { GACXPInstance } = await getInstance({ from: accounts[0] });

        await GACXPInstance.mint(2000, accounts[1], { from: accounts[0] });
        await GACXPInstance.approve(accounts[2], 1000, { from: accounts[1] });

        // fails for more than allowed
        await truffleAssert.fails(
            GACXPInstance.burn(accounts[1], 2000, { from: accounts[2] })
        );
        await GACXPInstance.burn(accounts[1], 1000, { from: accounts[2] });

        assert.equal((await GACXPInstance.totalSupply()).toString(), '1000');
        assert.equal(
            (
                await GACXPInstance.allowance(accounts[1], accounts[2])
            ).toString(),
            '0'
        );
    });
});
