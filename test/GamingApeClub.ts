import { BN } from 'bn.js';
import keccak256 from 'keccak256';
import MerkleTree from 'merkletreejs';

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
    InsufficientRemaining = 'Insuf. amount',
}

contract('GamingApeClub', (accounts) => {
    const getTestWhitelist = (size: number) => {
        return Array.from(new Array(size)).map(
            () => web3.eth.accounts.create().address
        );
    };

    const buildInstance = async (
        presaleStart: number | undefined = undefined,
        presaleEnd: number | undefined = undefined,
        presaleResetTime: number | undefined = undefined,
        publicStart: number | undefined = undefined,
        maxSupply = 10000,
        price = 10,
        walletMax = 1,
        devAddress = accounts[9],
        baseUri = 'test/',
        meta: Truffle.TransactionDetails = { from: accounts[0] }
    ) => {
        const now = Math.floor(Date.now() / 1000);
        const later = 2 * now;

        const GamingApeClubInstance = await GamingApeClub.new(
            devAddress,
            maxSupply,
            walletMax,
            price,
            presaleStart ?? now,
            presaleResetTime ?? later,
            presaleEnd ?? later,
            publicStart ?? now,
            baseUri,
            meta
        );

        const deploymentHash = GamingApeClubInstance.transactionHash;
        const tx = await web3.eth.getTransactionReceipt(deploymentHash);

        return {
            GamingApeClubInstance,
            presaleStart,
            presaleEnd,
            publicStart,
            maxSupply,
            price,
            devAddress,
            baseUri,
            tx,
        };
    };

    it('constructs', async () => {
        const { GamingApeClubInstance, price, devAddress, tx } =
            await buildInstance();

        console.log(`Gas to deploy contract: ${tx.gasUsed}`);

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
        const tx = await GamingApeClubInstance.ownerMint(10, accounts[1]);
        console.log(`Gas to ownerMint 10: ${tx.receipt.gasUsed}`);

        assert.equal(
            (await GamingApeClubInstance.balanceOf(accounts[1])).toString(),
            '10'
        );
        assert.equal(
            (
                await GamingApeClubInstance.getPresaleMints(accounts[0], false)
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

        const tx0 = await GamingApeClubInstance.ownerMint(1, accounts[0]);
        assert.equal(
            (await GamingApeClubInstance.tokenURI(0)).toString(),
            `${baseUri}0`
        );

        console.log(`Gas to ownerMint 1: ${tx0.receipt.gasUsed}`);

        // fails for non owner/dev
        truffleAssert.reverts(
            GamingApeClubInstance.setBaseURI('newUri/', {
                from: accounts[1],
            }),
            ErrorMessage.NotOwnerOrDev
        );

        const tx1 = await GamingApeClubInstance.setBaseURI('newUri/');
        console.log(`Gas to set baseURI: ${tx1.receipt.gasUsed}`);

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
            GamingApeClubInstance.setMintDates(1, 1, 1, 1, {
                from: accounts[1],
            }),
            ErrorMessage.NotOwnerOrDev
        );

        await GamingApeClubInstance.setMintDates(1, 1, 1, 1);

        // works for dev
        await GamingApeClubInstance.setMintDates(2, 2, 2, 2, {
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

        const disbursmentAddresses = [
            '0x568bFbBD4F4e4CA9Fb15729A61E660786207e94f',
            '0x7436F0949BCa6b6C6fD766b6b9AA57417B0314A9',
            '0x13c4d22a8dbB2559B516E10FE0DE47ba4b4A03EB',
            '0xB3D665d27A1AE8F2f3C32cB1178c9E749ce00714',
            '0x470049b45A5f05c84e9285Cb467642733450acE5',
            '0xcbFF601C8745a86e39d9dcB4725B7e6019f5e4FE',
        ];

        const initialBalances = (
            await Promise.all(
                disbursmentAddresses.map((v) => web3.eth.getBalance(v))
            )
        ).map((v) => new BN(v));

        const tx = await GamingApeClubInstance.withdraw();
        console.log(`Gas to set withdraw: ${tx.receipt.gasUsed}`);

        assert.equal(
            (
                await web3.eth.getBalance(GamingApeClubInstance.address)
            ).toString(),
            '0'
        );

        // 85%
        assert.equal(
            (await web3.eth.getBalance(disbursmentAddresses[0])).toString(),
            new BN('425000000000000000').add(initialBalances[0]).toString()
        );

        // 4%
        assert.equal(
            (await web3.eth.getBalance(disbursmentAddresses[1])).toString(),
            new BN('20000000000000000').add(initialBalances[1]).toString()
        );

        const expectedThreePercent = '15000000000000000';

        // 3%
        assert.equal(
            (await web3.eth.getBalance(disbursmentAddresses[2])).toString(),
            new BN(expectedThreePercent).add(initialBalances[2]).toString()
        );

        // 3%
        assert.equal(
            (await web3.eth.getBalance(disbursmentAddresses[3])).toString(),
            new BN(expectedThreePercent).add(initialBalances[3]).toString()
        );

        // 3%
        assert.equal(
            (await web3.eth.getBalance(disbursmentAddresses[4])).toString(),
            new BN(expectedThreePercent).add(initialBalances[4]).toString()
        );

        // 2%
        assert.equal(
            (await web3.eth.getBalance(disbursmentAddresses[5])).toString(),
            new BN('10000000000000000').add(initialBalances[5]).toString()
        );
    });

    // TODO: getPresaleMints and getPublicMints

    it('calls premint', async () => {
        const now = Math.floor(Date.now() / 1000);
        const later = Math.floor(new Date(5000, 12).valueOf() / 1000);

        const { GamingApeClubInstance, price } = await buildInstance(
            later,
            later,
            later,
            later,
            7 // supply 7, 2 left
        );

        const whitelist = getTestWhitelist(30).concat(...accounts); // whitelist
        const leaves = whitelist.map(keccak256);
        const tree = new MerkleTree(leaves, keccak256, { sort: true });

        const root = tree.getHexRoot();
        const account1Leaf = keccak256(accounts[1]);
        const account3Leaf = keccak256(accounts[3]);
        const account4Leaf = keccak256(accounts[4]);
        const proof1 = tree.getHexProof(account1Leaf);
        const proof3 = tree.getHexProof(account3Leaf);
        const proof4 = tree.getHexProof(account4Leaf);

        const badLeaves = getTestWhitelist(30)
            .concat(accounts[1])
            .map(keccak256);
        const badTree = new MerkleTree(badLeaves, keccak256, { sort: true });
        const badProof1 = badTree.getHexProof(account1Leaf);

        await GamingApeClubInstance.setMerkleRoot(root);

        // inactive mint
        await truffleAssert.reverts(
            GamingApeClubInstance.premint(1, proof1, {
                from: accounts[1],
                value: String(price),
            }),
            ErrorMessage.Inactive
        );

        await GamingApeClubInstance.setMintDates(now, later, later, now);

        // invalid value
        await truffleAssert.reverts(
            GamingApeClubInstance.premint(1, proof1, { from: accounts[1] }),
            ErrorMessage.BadValue
        );

        // invalid proof
        await truffleAssert.reverts(
            GamingApeClubInstance.premint(1, badProof1, {
                from: accounts[1],
                value: String(price),
            }),
            ErrorMessage.InvalidProof
        );

        // limit exceeded
        await truffleAssert.reverts(
            GamingApeClubInstance.premint(2, proof1, {
                from: accounts[1],
                value: String(price * 2),
            }),
            ErrorMessage.LimitExceeded
        );

        // successful mint (1 left)
        await GamingApeClubInstance.premint(1, proof1, {
            from: accounts[1],
            value: String(price),
        });
        assert.equal(
            (await GamingApeClubInstance.balanceOf(accounts[1])).toString(),
            '1'
        );
        assert.equal(
            (
                await GamingApeClubInstance.getPresaleMints(accounts[1], false)
            ).toString(),
            '1'
        );

        // exceeds limit
        await truffleAssert.reverts(
            GamingApeClubInstance.premint(1, proof1, {
                from: accounts[1],
                value: String(price),
            }),
            ErrorMessage.LimitExceeded
        );

        // success (0 left)
        const tx = await GamingApeClubInstance.premint(1, proof3, {
            from: accounts[3],
            value: String(price),
        });

        console.log(`Gas to premint 1: ${tx.receipt.gasUsed}`);

        // failed due to mint over
        await truffleAssert.reverts(
            GamingApeClubInstance.premint(1, proof4, {
                from: accounts[4],
                value: String(price),
            }),
            ErrorMessage.MintOver
        );

        assert.equal(
            (
                await GamingApeClubInstance.getPresaleMints(accounts[3], false)
            ).toString(),
            '1'
        );
        assert.equal(
            (
                await GamingApeClubInstance.getPublicMints(accounts[3])
            ).toString(),
            '0'
        );

        assert.equal(
            (
                await GamingApeClubInstance.getPresaleMints(accounts[1], false)
            ).toString(),
            '1'
        );
        assert.equal(
            (
                await GamingApeClubInstance.getPublicMints(accounts[1])
            ).toString(),
            '0'
        );
    });

    it.only('calls premint (before/after reset)', async () => {
        const now = Math.floor(Date.now() / 1000);
        const later = Math.floor(new Date(5000, 12).valueOf() / 1000);

        const { GamingApeClubInstance, price } = await buildInstance(
            now,
            later,
            later,
            later,
            9, // supply 9, 4 left
            undefined,
            1
        );

        const whitelist = getTestWhitelist(30).concat(...accounts); // whitelist
        const leaves = whitelist.map(keccak256);
        const tree = new MerkleTree(leaves, keccak256, { sort: true });

        const root = tree.getHexRoot();
        const account1Leaf = keccak256(accounts[1]);
        const account3Leaf = keccak256(accounts[3]);
        const proof1 = tree.getHexProof(account1Leaf);
        const proof3 = tree.getHexProof(account3Leaf);

        await GamingApeClubInstance.setMerkleRoot(root);
        await GamingApeClubInstance.setMintDates(now, later, later, now);

        // invalid value
        await truffleAssert.reverts(
            GamingApeClubInstance.premint(1, proof1, { from: accounts[1] }),
            ErrorMessage.BadValue
        );

        // successful mint (3 left)
        await GamingApeClubInstance.premint(1, proof1, {
            from: accounts[1],
            value: String(price),
        });
        assert.equal(
            (await GamingApeClubInstance.balanceOf(accounts[1])).toString(),
            '1'
        );
        assert.equal(
            (
                await GamingApeClubInstance.getPresaleMints(accounts[1], false)
            ).toString(),
            '1'
        );

        // success (2 left)
        await GamingApeClubInstance.premint(1, proof3, {
            from: accounts[3],
            value: String(price),
        });

        // failed due to exceed
        await truffleAssert.reverts(
            GamingApeClubInstance.premint(1, proof3, {
                from: accounts[3],
                value: String(price),
            }),
            ErrorMessage.LimitExceeded
        );

        assert.equal(
            (
                await GamingApeClubInstance.getPresaleMints(accounts[3], false)
            ).toString(),
            '1'
        );

        assert.equal(
            (
                await GamingApeClubInstance.getPresaleMints(accounts[3], true)
            ).toString(),
            '0'
        );

        assert.equal(
            (
                await GamingApeClubInstance.getPresaleMints(accounts[1], false)
            ).toString(),
            '1'
        );

        assert.equal(
            (
                await GamingApeClubInstance.getPresaleMints(accounts[1], true)
            ).toString(),
            '0'
        );

        // failed due to exceed
        await truffleAssert.reverts(
            GamingApeClubInstance.premint(1, proof1, {
                from: accounts[1],
                value: String(price),
            }),
            ErrorMessage.LimitExceeded
        );

        // after reset
        await GamingApeClubInstance.setMintDates(now, now, later, later);

        // success (1 left)
        await GamingApeClubInstance.premint(1, proof1, {
            from: accounts[1],
            value: String(price),
        });

        // failed due to exceed
        await truffleAssert.reverts(
            GamingApeClubInstance.premint(1, proof1, {
                from: accounts[1],
                value: String(price),
            }),
            ErrorMessage.LimitExceeded
        );

        // success (0 left)
        await GamingApeClubInstance.premint(1, proof3, {
            from: accounts[3],
            value: String(price),
        });

        assert.equal(
            (
                await GamingApeClubInstance.getPresaleMints(accounts[3], false)
            ).toString(),
            '1'
        );

        assert.equal(
            (
                await GamingApeClubInstance.getPresaleMints(accounts[3], true)
            ).toString(),
            '1'
        );

        assert.equal(
            (
                await GamingApeClubInstance.getPublicMints(accounts[3])
            ).toString(),
            '0'
        );

        assert.equal(
            (
                await GamingApeClubInstance.getPresaleMints(accounts[1], false)
            ).toString(),
            '1'
        );

        assert.equal(
            (
                await GamingApeClubInstance.getPresaleMints(accounts[1], true)
            ).toString(),
            '1'
        );

        assert.equal(
            (
                await GamingApeClubInstance.getPublicMints(accounts[1])
            ).toString(),
            '0'
        );
    });

    it('calls premint (more than 1 minted, just in case)', async () => {
        const now = Math.floor(Date.now() / 1000);
        const later = Math.floor(new Date(5000, 12).valueOf() / 1000);

        const { GamingApeClubInstance, price } = await buildInstance(
            now,
            later,
            later,
            later,
            10, // supply 10, 5 left
            undefined,
            4
        );

        const whitelist = getTestWhitelist(30).concat(...accounts); // whitelist
        const leaves = whitelist.map(keccak256);
        const tree = new MerkleTree(leaves, keccak256, { sort: true });

        const root = tree.getHexRoot();
        const account1Leaf = keccak256(accounts[1]);
        const account4Leaf = keccak256(accounts[4]);
        const proof1 = tree.getHexProof(account1Leaf);
        const proof4 = tree.getHexProof(account4Leaf);

        const tx1 = await GamingApeClubInstance.setMerkleRoot(root);
        console.log(`Gas to set merkle root: ${tx1.receipt.gasUsed}`);

        await truffleAssert.reverts(
            GamingApeClubInstance.premint(5, proof4, {
                from: accounts[4],
                value: String(price * 5),
            }),
            ErrorMessage.LimitExceeded
        );

        // success (1 left)
        const tx = await GamingApeClubInstance.premint(4, proof1, {
            from: accounts[1],
            value: String(price * 4),
        });

        console.log(`Gas to premint 4: ${tx.receipt.gasUsed}`);

        // failed due to insufficient remaining
        await truffleAssert.reverts(
            GamingApeClubInstance.premint(2, proof4, {
                from: accounts[4],
                value: String(price * 2),
            }),
            ErrorMessage.InsufficientRemaining
        );

        // succeeds on last (0 left)
        await GamingApeClubInstance.premint(1, proof4, {
            from: accounts[4],
            value: String(price),
        });

        // failed due to mint over
        await truffleAssert.reverts(
            GamingApeClubInstance.premint(1, proof4, {
                from: accounts[4],
                value: String(price),
            }),
            ErrorMessage.MintOver
        );

        assert.equal(
            (
                await GamingApeClubInstance.getPresaleMints(accounts[4], false)
            ).toString(),
            '1'
        );
        assert.equal(
            (
                await GamingApeClubInstance.getPublicMints(accounts[4])
            ).toString(),
            '0'
        );

        assert.equal(
            (
                await GamingApeClubInstance.getPresaleMints(accounts[1], false)
            ).toString(),
            '4'
        );
        assert.equal(
            (
                await GamingApeClubInstance.getPublicMints(accounts[4])
            ).toString(),
            '0'
        );
    });

    it('calls mint', async () => {
        const now = Math.floor(Date.now() / 1000);
        const later = Math.floor(new Date(5000, 12).valueOf() / 1000);

        const { GamingApeClubInstance, price } = await buildInstance(
            later,
            later,
            later,
            later,
            10, // supply 10, 5 left
            undefined,
            1
        );

        // fails due to mint not being active
        await truffleAssert.reverts(
            GamingApeClubInstance.mint(1, { value: String(price) }),
            ErrorMessage.Inactive
        );

        // activate mint
        const tx0 = await GamingApeClubInstance.setMintDates(
            later,
            later,
            later,
            now
        );
        console.log(`Gas to set mint dates: ${tx0.receipt.gasUsed}`);

        // fails due to exceeding limit
        await truffleAssert.reverts(
            GamingApeClubInstance.mint(2, {
                value: String(price * 2),
                from: accounts[1],
            }),
            ErrorMessage.LimitExceeded
        );

        // fails due to bad value
        await truffleAssert.reverts(
            GamingApeClubInstance.mint(1, {
                value: String(price - 1),
                from: accounts[1],
            }),
            ErrorMessage.BadValue
        );

        // mints successfully (4 left)
        const tx1 = await GamingApeClubInstance.mint(1, {
            value: String(price),
            from: accounts[1],
        });
        console.log(`Gas to mint 1: ${tx1.receipt.gasUsed}`);

        // fails due to exceeded limit
        await truffleAssert.reverts(
            GamingApeClubInstance.mint(1, {
                value: String(price),
                from: accounts[1],
            }),
            ErrorMessage.LimitExceeded
        );

        // increases limit
        await GamingApeClubInstance.setMaxPerWallet(10);

        // fails due to insufficient remaining (4 left)
        await truffleAssert.reverts(
            GamingApeClubInstance.mint(5, {
                value: String(price * 5),
                from: accounts[1],
            }),
            ErrorMessage.InsufficientRemaining
        );

        // mints last 4 remaining (0 left)
        const tx2 = await GamingApeClubInstance.mint(4, {
            value: String(price * 4),
            from: accounts[4],
        });
        console.log(`Gas to mint 4: ${tx2.receipt.gasUsed}`);

        // fails due to mint over
        await truffleAssert.reverts(
            GamingApeClubInstance.mint(1, {
                value: String(price),
                from: accounts[1],
            }),
            ErrorMessage.MintOver
        );

        // assert balances
        assert.equal(
            (await GamingApeClubInstance.balanceOf(accounts[1])).toString(),
            '1'
        );
        assert.equal(
            (
                await GamingApeClubInstance.getPublicMints(accounts[1])
            ).toString(),
            '1'
        );
        assert.equal(
            (
                await GamingApeClubInstance.getPresaleMints(accounts[1], false)
            ).toString(),
            '0'
        );
        assert.equal(
            (await GamingApeClubInstance.balanceOf(accounts[4])).toString(),
            '4'
        );
        assert.equal(
            (
                await GamingApeClubInstance.getPublicMints(accounts[4])
            ).toString(),
            '4'
        );
        assert.equal(
            (
                await GamingApeClubInstance.getPresaleMints(accounts[4], false)
            ).toString(),
            '0'
        );
    });

    it('calls burn', async () => {
        const { GamingApeClubInstance } = await buildInstance();

        assert.equal(
            (await GamingApeClubInstance.balanceOf(accounts[0])).toString(),
            '5'
        );
        assert.equal(await GamingApeClubInstance.ownerOf(0), accounts[0]);

        // fails if a different account attempts to call burn
        await truffleAssert.reverts(
            GamingApeClubInstance.burn(0, { from: accounts[1] }),
            ErrorMessage.NotOwner
        );

        // fails if token does not exist
        await truffleAssert.fails(GamingApeClubInstance.burn(10));

        // succeeds for token owner
        await GamingApeClubInstance.burn(0);

        assert.equal(
            (await GamingApeClubInstance.balanceOf(accounts[0])).toString(),
            '4'
        );
        assert.equal(await GamingApeClubInstance.ownerOf(4), accounts[0]);

        // fails if attempt to burn again
        await truffleAssert.fails(GamingApeClubInstance.burn(0));
    });
});

export default {};
