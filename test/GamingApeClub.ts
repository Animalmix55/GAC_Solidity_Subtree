// eslint-disable-next-line @typescript-eslint/no-var-requires
const truffleAssert = require('truffle-assertions');

const GamingApeClub = artifacts.require('GamingApeClub');

enum ErrorMessage {
    NotOwnerOrDev = 'Ownable: caller is not the owner or developer',
    MintOver = 'Mint over',
    NotEnough = 'Not enough',
    TransFailed = 'Trans failed',
    Inactive = 'Inactive',
    InvalidProod = 'Invalid proof',
    BadValue = 'Bad value',
    LimitExceeded = 'Limit exceeded',
    NotOwner = 'Not owner',
}

contract('GamingApeClub', (accounts) => {
    const buildInstance = async (
        presaleStart: number | undefined = undefined,
        presaleEnd: number | undefined = undefined,
        publicStart: number | undefined = undefined,
        maxSupply = 10000,
        price = 10,
        devAddress = accounts[9],
        meta: Truffle.TransactionDetails = { from: accounts[0] }
    ) => {
        const now = Math.floor(Date.now() / 1000);
        const later = 2 * now;

        const GamingApeClubInstance = await GamingApeClub.new(
            devAddress,
            maxSupply,
            price,
            presaleStart ?? now,
            presaleEnd ?? later,
            publicStart ?? now,
            meta
        );

        return {
            GamingApeClubInstance,
            presaleStart,
            presaleEnd,
            publicStart,
            maxSupply,
            price,
            devAddress,
        };
    };

    it('constructs', async () => {
        const { GamingApeClubInstance, price, devAddress } =
            await buildInstance();

        assert.equal(await GamingApeClubInstance.symbol(), 'GAC');
        assert.equal(await GamingApeClubInstance.name(), 'Gaming Ape Club');
        assert.equal(await GamingApeClubInstance.developer(), devAddress);

        assert.equal(
            (await GamingApeClubInstance.mintPrice()).toString(),
            String(price)
        );

        // mints 5 initially
        assert.equal(
            (await GamingApeClubInstance.totalSupply()).toString(),
            '5'
        );
    });

    it('calls ownerMint', async () => {
        const { GamingApeClubInstance } = await buildInstance(
            undefined,
            undefined,
            undefined,
            15 // 5 used on deploy
        );

        // fails if not owner
        await truffleAssert.fails(
            GamingApeClubInstance.ownerMint(1, accounts[0], {
                from: accounts[1],
            }) // not owner
        );

        // fails if exceeds supply
        await truffleAssert.reverts(
            GamingApeClubInstance.ownerMint(11, accounts[0]),
            ErrorMessage.NotEnough
        );

        // succeeds
        await GamingApeClubInstance.ownerMint(10, accounts[1]);
        assert.equal(
            (await GamingApeClubInstance.balanceOf(accounts[1])).toString(),
            '10'
        );
        assert.equal(
            (
                await GamingApeClubInstance.getPresaleMints(accounts[0])
            ).toString(),
            '15'
        );

        // fails if no supply left
        await truffleAssert.reverts(
            GamingApeClubInstance.ownerMint(1, accounts[0]),
            ErrorMessage.MintOver
        );
    });
});

export default {};
