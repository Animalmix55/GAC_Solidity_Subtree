import { BN } from 'bn.js';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const truffleAssert = require('truffle-assertions');

const GamingApeClub = artifacts.require('GamingApeClub');

enum ErrorMessage {
    NotOwnerOrDev = 'Ownable: caller is not the owner or developer',
    MintOver = 'Mint over',
    NotEnough = 'Not enough',
    TransFailed = 'Trans failed',
    Inactive = 'Inactive',
    InvalidProof = 'Invalid proof',
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
        baseUri = 'test/',
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
            baseUri,
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
            baseUri,
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

    it('calls setBaseURI', async () => {
        const { GamingApeClubInstance, baseUri, devAddress } =
            await buildInstance();

        await GamingApeClubInstance.ownerMint(1, accounts[0]);
        assert.equal(
            (await GamingApeClubInstance.tokenURI(0)).toString(),
            `${baseUri}0`
        );

        // fails for non owner/dev
        truffleAssert.reverts(
            GamingApeClubInstance.setBaseURI('newUri/', {
                from: accounts[1],
            }),
            ErrorMessage.NotOwnerOrDev
        );

        await GamingApeClubInstance.setBaseURI('newUri/');
        assert.equal(
            (await GamingApeClubInstance.tokenURI(0)).toString(),
            'newUri/0'
        );

        // works for dev
        await GamingApeClubInstance.setBaseURI('newUri2/', {
            from: devAddress,
        });
        assert.equal(
            (await GamingApeClubInstance.tokenURI(0)).toString(),
            'newUri2/0'
        );
    });

    it('calls setMintPrice', async () => {
        const { GamingApeClubInstance, price, devAddress } =
            await buildInstance();

        assert.equal(
            (await GamingApeClubInstance.mintPrice()).toString(),
            String(price)
        );

        // fails for non owner/dev
        truffleAssert.reverts(
            GamingApeClubInstance.setMintPrice(price + 1, {
                from: accounts[1],
            }),
            ErrorMessage.NotOwnerOrDev
        );

        await GamingApeClubInstance.setMintPrice(price + 1);
        assert.equal(
            (await GamingApeClubInstance.mintPrice()).toString(),
            String(price + 1)
        );

        // works for dev
        await GamingApeClubInstance.setMintPrice(price + 2, {
            from: devAddress,
        });
        assert.equal(
            (await GamingApeClubInstance.mintPrice()).toString(),
            String(price + 2)
        );
    });

    it('calls setMerkleRoot', async () => {
        const { GamingApeClubInstance, devAddress } = await buildInstance();

        const merkleRoot =
            '0x7465737400000000000000000000000000000000000000000000000000000000';

        // fails for non owner/dev
        truffleAssert.reverts(
            GamingApeClubInstance.setMerkleRoot(merkleRoot, {
                from: accounts[1],
            }),
            ErrorMessage.NotOwnerOrDev
        );

        await GamingApeClubInstance.setMerkleRoot(merkleRoot);

        // works for dev
        await GamingApeClubInstance.setMerkleRoot(merkleRoot, {
            from: devAddress,
        });
    });

    it('calls setMintDates', async () => {
        const { GamingApeClubInstance, devAddress } = await buildInstance();

        // fails for non owner/dev
        truffleAssert.reverts(
            GamingApeClubInstance.setMintDates(1, 1, 1, {
                from: accounts[1],
            }),
            ErrorMessage.NotOwnerOrDev
        );

        await GamingApeClubInstance.setMintDates(1, 1, 1);

        // works for dev
        await GamingApeClubInstance.setMintDates(2, 2, 2, {
            from: devAddress,
        });
    });

    it('calls withdraw', async () => {
        const { GamingApeClubInstance } = await buildInstance();

        const amountWei = web3.utils.toWei(new BN(1), 'ether').div(new BN(2));

        // send 0.5 ETH to contract
        await web3.eth.sendTransaction({
            from: accounts[0],
            to: GamingApeClubInstance.address,
            value: amountWei,
        });

        assert.equal(
            (
                await web3.eth.getBalance(GamingApeClubInstance.address)
            ).toString(),
            amountWei.toString()
        );

        // fails when called by non-owner/dev
        await truffleAssert.reverts(
            GamingApeClubInstance.withdraw({ from: accounts[1] }),
            ErrorMessage.NotOwnerOrDev
        );

        await GamingApeClubInstance.withdraw();

        assert.equal(
            (
                await web3.eth.getBalance(GamingApeClubInstance.address)
            ).toString(),
            '0'
        );

        // 85%
        assert.equal(
            (
                await web3.eth.getBalance(
                    '0x568bFbBD4F4e4CA9Fb15729A61E660786207e94f'
                )
            ).toString(),
            '425000000000000000'
        );

        // 4%
        assert.equal(
            (
                await web3.eth.getBalance(
                    '0x7436F0949BCa6b6C6fD766b6b9AA57417B0314A9'
                )
            ).toString(),
            '20000000000000000'
        );

        const expectedThreePercent = '15000000000000000';

        // 3%
        assert.equal(
            (
                await web3.eth.getBalance(
                    '0x13c4d22a8dbB2559B516E10FE0DE47ba4b4A03EB'
                )
            ).toString(),
            expectedThreePercent
        );

        // 3%
        assert.equal(
            (
                await web3.eth.getBalance(
                    '0xB3D665d27A1AE8F2f3C32cB1178c9E749ce00714'
                )
            ).toString(),
            expectedThreePercent
        );

        // 3%
        assert.equal(
            (
                await web3.eth.getBalance(
                    '0x470049b45A5f05c84e9285Cb467642733450acE5'
                )
            ).toString(),
            expectedThreePercent
        );

        // 2%
        assert.equal(
            (
                await web3.eth.getBalance(
                    '0xcbFF601C8745a86e39d9dcB4725B7e6019f5e4FE'
                )
            ).toString(),
            '10000000000000000'
        );
    });
});

export default {};
