// eslint-disable-next-line @typescript-eslint/no-var-requires
const truffleAssert = require('truffle-assertions');

const ERC721GAC = artifacts.require('ERC721GACWrapper');
const ERC721Reciever = artifacts.require('TestERC721Receiver');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

enum MintType {
    Private,
    Aux,
    Public,
}

contract('ERC721GAC', (accounts) => {
    const buildInstance = (
        name = 'test',
        symbol = 'test',
        baseUri = '',
        meta: Truffle.TransactionDetails = { from: accounts[0] }
    ) => ERC721GAC.new(name, symbol, baseUri, meta);

    it('calls constructor', async () => {
        const instance = await buildInstance('Name', 'Symbol');

        const name = await instance.name();
        const symbol = await instance.symbol();

        assert.equal(name, 'Name');
        assert.equal(symbol, 'Symbol');
    });

    it('calls totalSupply', async () => {
        const instance = await buildInstance();

        let initialSupply = await instance.totalSupply();
        assert.equal(initialSupply.toString(), '0');

        // mint a few
        await instance.mint(
            accounts[0],
            accounts[0],
            10,
            true,
            MintType.Public
        );
        initialSupply = await instance.totalSupply();

        assert.equal(initialSupply.toString(), '10');

        // mint one more
        await instance.mint(accounts[0], accounts[0], 1, true, MintType.Public);
        initialSupply = await instance.totalSupply();

        assert.equal(initialSupply.toString(), '11');
    });

    it('calls tokenByIndex', async () => {
        const instance = await buildInstance();

        // not yet exists
        await truffleAssert.fails(instance.tokenByIndex(0));

        // mint 10
        await instance.mint(
            accounts[0],
            accounts[0],
            10,
            true,
            MintType.Public
        );

        let index = await instance.tokenByIndex(0);
        assert.equal(index.toString(), '0');

        index = await instance.tokenByIndex(1);
        assert.equal(index.toString(), '1');

        // now burn token 0
        await instance.burn(0);

        index = await instance.tokenByIndex(0);
        assert.equal(index.toString(), '1');

        index = await instance.tokenByIndex(1);
        assert.equal(index.toString(), '2');
    });

    it('calls tokenOfOwnerByIndex', async () => {
        const instance = await buildInstance();

        // fails on out of bounds
        await truffleAssert.fails(instance.tokenOfOwnerByIndex(accounts[0], 0));

        // mint 10
        await instance.mint(
            accounts[0],
            accounts[0],
            10,
            true,
            MintType.Public
        );

        let tokenId = await instance.tokenOfOwnerByIndex(accounts[0], 0);
        assert.equal(tokenId.toString(), '0');

        tokenId = await instance.tokenOfOwnerByIndex(accounts[0], 9);
        assert.equal(tokenId.toString(), '9');

        // burn one
        await instance.burn(7);

        tokenId = await instance.tokenOfOwnerByIndex(accounts[0], 8);
        assert.equal(tokenId.toString(), '9');

        // fails for other account
        await truffleAssert.fails(instance.tokenOfOwnerByIndex(accounts[1], 0));
    });

    it('calls supportInterface (only checks IERC721 for now)', async () => {
        const instance = await buildInstance();

        // supports IERC721
        assert.ok(await instance.supportsInterface('0x80ac58cd'));
    });

    it('calls balanceOf', async () => {
        const instance = await buildInstance();

        assert.equal((await instance.balanceOf(accounts[0])).toString(), '0');
        await instance.mint(
            accounts[0],
            accounts[0],
            '5',
            true,
            MintType.Public
        );
        assert.equal((await instance.balanceOf(accounts[0])).toString(), '5');

        assert.equal((await instance.balanceOf(accounts[1])).toString(), '0');
        await instance.mint(
            accounts[1],
            accounts[1],
            '3',
            true,
            MintType.Public
        );
        assert.equal((await instance.balanceOf(accounts[1])).toString(), '3');
    });

    it('calls ownerOf', async () => {
        const instance = await buildInstance();

        // try non-existent token
        await truffleAssert.fails(instance.ownerOf(0));

        // mint
        await instance.mint(
            accounts[0],
            accounts[0],
            10,
            true,
            MintType.Public
        );
        assert.equal(await instance.ownerOf(9), accounts[0]);

        await instance.mint(accounts[1], accounts[1], 2, true, MintType.Public);
        assert.equal(await instance.ownerOf(10), accounts[1]);

        await truffleAssert.fails(instance.ownerOf(12));

        // fails for out of bounds
        await truffleAssert.fails(instance.ownerOf(2 ** 17));
    });

    it('calls name', async () => {
        assert.equal(await (await buildInstance('name')).name(), 'name');
    });

    it('calls symbol', async () => {
        assert.equal(
            await (await buildInstance('name', 'symbol')).symbol(),
            'symbol'
        );
    });

    it('calls tokenURI', async () => {
        const instance = await buildInstance('name', 'symbol', 'uri/');

        // fails on nonexistent token
        await truffleAssert.fails(instance.tokenURI(0));

        await instance.mint(
            accounts[0],
            accounts[0],
            10,
            true,
            MintType.Public
        );

        assert.equal(await instance.tokenURI(9), 'uri/9');
        assert.equal(await instance.tokenURI(0), 'uri/0');
        await truffleAssert.fails(instance.tokenURI(10));
    });

    it('calls approve', async () => {
        const instance = await buildInstance();

        // fails on nonexistent token
        await truffleAssert.fails(instance.approve(accounts[1], 0));

        // mint
        await instance.mint(
            accounts[0],
            accounts[0],
            10,
            true,
            MintType.Public
        );

        // approve
        await instance.approve(accounts[1], 0);

        // fails if same as owner
        await truffleAssert.fails(instance.approve(accounts[0], 1));

        // fails if caller doesn't own token
        await truffleAssert.fails(
            instance.approve(accounts[2], 1, { from: accounts[1] })
        );
    });

    it('calls getApproved', async () => {
        const instance = await buildInstance();

        // fails on nonexistent token
        await truffleAssert.fails(instance.getApproved(0));

        // mint
        await instance.mint(
            accounts[0],
            accounts[0],
            10,
            true,
            MintType.Public
        );

        // approve
        await instance.approve(accounts[1], 0);
        await instance.approve(accounts[2], 1);
        assert.equal(await instance.getApproved(0), accounts[1]);
        assert.equal(await instance.getApproved(1), accounts[2]);
        assert.equal(await instance.getApproved(2), ZERO_ADDRESS);
    });

    it('calls setApprovalForAll/isApprovedForAll', async () => {
        const instance = await buildInstance();

        // fails for same address as caller
        await truffleAssert.fails(
            instance.setApprovalForAll(accounts[0], true)
        );

        await instance.setApprovalForAll(accounts[1], true);
        assert.ok(await instance.isApprovedForAll(accounts[0], accounts[1]));

        await instance.setApprovalForAll(accounts[1], false);
        assert.isNotOk(
            await instance.isApprovedForAll(accounts[0], accounts[1])
        );
    });

    it('calls transferFrom (_transfer)', async () => {
        const notReciever = await ERC721GAC.new('', '', '');

        const instance = await buildInstance();

        // fails if token does not exist
        await truffleAssert.fails(
            instance.transferFrom(accounts[0], accounts[1], 0)
        );

        await instance.mint(
            accounts[0],
            accounts[0],
            10,
            true,
            MintType.Public
        );

        // fails if sender is not approved
        await truffleAssert.fails(
            instance.transferFrom(accounts[0], accounts[1], 0, {
                from: accounts[1],
            })
        );

        // fails if transferring from wrong owner
        await truffleAssert.fails(
            instance.transferFrom(accounts[1], accounts[0], 0)
        );

        // fails if trying to burn
        await truffleAssert.fails(
            instance.transferFrom(accounts[0], ZERO_ADDRESS, 0)
        );

        // succeeds if called by owner (token 0)
        await instance.transferFrom(accounts[0], accounts[1], 0);
        assert.equal(await instance.ownerOf(0), accounts[1]);

        // succeeds if called by approvedForAll (token 1)
        await instance.setApprovalForAll(accounts[1], true);
        await instance.transferFrom(accounts[0], accounts[1], 1, {
            from: accounts[1],
        });
        assert.equal(await instance.ownerOf(1), accounts[1]);

        // succeeds if called by approved for individual token (token 2)
        await instance.approve(accounts[2], 2);
        await instance.transferFrom(accounts[0], accounts[1], 2, {
            from: accounts[2],
        });
        assert.equal(await instance.ownerOf(2), accounts[1]);

        // succeeds on a non-receiver (token 3)
        await instance.transferFrom(accounts[0], notReciever.address, 3);
        assert.equal(await instance.ownerOf(3), notReciever.address);

        // check balances
        assert.equal((await instance.balanceOf(accounts[0])).toString(), '6');
        assert.equal((await instance.balanceOf(accounts[1])).toString(), '3');
        assert.equal(
            (await instance.balanceOf(notReciever.address)).toString(),
            '1'
        );

        // resets approvals
        assert.equal(await instance.getApproved(2), ZERO_ADDRESS);
    });

    it('calls safeTransferFrom', async () => {
        const instance = await buildInstance();
        const receiver = await ERC721Reciever.new();

        await instance.mint(
            accounts[0],
            accounts[0],
            10,
            true,
            MintType.Public
        );

        // fails when data is not empty
        await truffleAssert.fails(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (instance as any).safeTransferFrom(
                accounts[0],
                receiver.address,
                0,
                '0x5d2f5bbd'
            )
        );

        // succeeds when data is empty (token 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).safeTransferFrom(accounts[0], receiver.address, 0);
    });

    it('calls mint (_mint)', async () => {
        const receiver = await ERC721Reciever.new();
        const instance = await buildInstance();

        // fails minting to zero address
        await truffleAssert.fails(
            instance.mint(ZERO_ADDRESS, ZERO_ADDRESS, 10, true, MintType.Public)
        );

        // fails minting zero tokens
        await truffleAssert.fails(
            instance.mint(accounts[0], accounts[0], 0, true, MintType.Public)
        );

        // succeeds minting one (public, unsafe)
        await instance.mint(
            accounts[0],
            accounts[0],
            1,
            false,
            MintType.Public
        );
        // succeeds minting one (public, safe)
        await instance.mint(accounts[0], accounts[0], 1, true, MintType.Public);
        // succeeds minting one (private, unsafe)
        await instance.mint(
            accounts[0],
            accounts[0],
            1,
            false,
            MintType.Private
        );
        // succeeds minting two (private, safe)
        await instance.mint(
            accounts[0],
            accounts[0],
            2,
            true,
            MintType.Private
        );
        // succeeds minting two (aux, unsafe)
        await instance.mint(accounts[0], accounts[0], 1, false, MintType.Aux);
        // succeeds minting two (aux, safe)
        await instance.mint(accounts[0], accounts[0], 2, true, MintType.Aux);

        // assert balance changed
        assert.equal((await instance.balanceOf(accounts[0])).toString(), '8');

        // assert owner set
        assert.equal(await instance.ownerOf(0), accounts[0]);
        assert.equal(await instance.ownerOf(1), accounts[0]);
        assert.equal(await instance.ownerOf(2), accounts[0]);
        assert.equal(await instance.ownerOf(3), accounts[0]);
        assert.equal(await instance.ownerOf(4), accounts[0]);
        assert.equal(await instance.ownerOf(5), accounts[0]);
        assert.equal(await instance.ownerOf(6), accounts[0]);
        assert.equal(await instance.ownerOf(7), accounts[0]);
        await truffleAssert.fails(instance.ownerOf(8)); // doesn't exist

        // assert mint counts set
        assert.equal(
            (await instance.privateMintCount(accounts[0])).toString(),
            '3'
        );
        assert.equal(
            (await instance.auxMintCount(accounts[0])).toString(),
            '3'
        );
        assert.equal(
            (await instance.publicMintCount(accounts[0])).toString(),
            '2'
        );

        // fails minting to receiver with data (safe)
        await truffleAssert.fails(
            instance.mintWithData(
                receiver.address,
                receiver.address,
                1,
                '0x5d2f5bbd',
                true,
                MintType.Public
            )
        );
        // succeeds to receiver (unsafe)
        await instance.mintWithData(
            receiver.address,
            receiver.address,
            1,
            '0x5d2f5bbd',
            false,
            MintType.Public
        );
        // succeeds to receiver (safe)
        await instance.mint(
            receiver.address,
            receiver.address,
            1,
            false,
            MintType.Public
        );

        assert.equal(
            (await instance.balanceOf(receiver.address)).toString(),
            '2'
        );

        // mints from another wallet
        await instance.mint(accounts[2], accounts[3], 2, true, MintType.Public);
        assert.equal((await instance.balanceOf(accounts[3])).toString(), '2');
        assert.equal(
            (await instance.publicMintCount(accounts[2])).toString(),
            '2'
        );
    });

    it('calls burn', async () => {
        const instance = await buildInstance();

        // mint
        await instance.mint(
            accounts[0],
            accounts[0],
            10,
            true,
            MintType.Public
        );
        assert.equal((await instance.totalSupply()).toString(), '10');
        assert.equal((await instance.balanceOf(accounts[0])).toString(), '10');

        await instance.approve(accounts[1], 0);
        assert.equal(await instance.getApproved(0), accounts[1]);

        await instance.burn(0);

        // decreases supply
        assert.equal((await instance.totalSupply()).toString(), '9');

        // removes existence
        truffleAssert.fails(instance.ownerOf(0));
        truffleAssert.fails(instance.getApproved(0));

        // updates balance
        assert.equal((await instance.balanceOf(accounts[0])).toString(), '9');

        // mints continue
        await instance.mint(accounts[0], accounts[0], 1, true, MintType.Public);
        assert.equal((await instance.balanceOf(accounts[0])).toString(), '10');
        assert.equal(await instance.ownerOf(10), accounts[0]);

        // fails on nonexistent token
        await truffleAssert.fails(instance.burn(100));
    });
});

export default {};
