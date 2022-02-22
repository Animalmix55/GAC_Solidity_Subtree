// eslint-disable-next-line @typescript-eslint/no-var-requires
const truffleAssert = require('truffle-assertions');

const ERC721GAC = artifacts.require('ERC721GACWrapper');
const ERC721Reciever = artifacts.require('TestERC721Receiver');

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
        await instance.mint(accounts[0], 10, true, false);
        initialSupply = await instance.totalSupply();

        assert.equal(initialSupply.toString(), '10');

        // mint one more
        await instance.mint(accounts[0], 1, true, false);
        initialSupply = await instance.totalSupply();

        assert.equal(initialSupply.toString(), '11');
    });

    it('calls tokenByIndex', async () => {
        const instance = await buildInstance();

        // not yet exists
        await truffleAssert.fails(instance.tokenByIndex(0));

        // mint 10
        await instance.mint(accounts[0], 10, true, false);

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
        await instance.mint(accounts[0], 10, true, false);

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
        await instance.mint(accounts[0], '5', true, false);
        assert.equal((await instance.balanceOf(accounts[0])).toString(), '5');

        assert.equal((await instance.balanceOf(accounts[1])).toString(), '0');
        await instance.mint(accounts[1], '3', true, false);
        assert.equal((await instance.balanceOf(accounts[1])).toString(), '3');
    });

    it('calls ownerOf', async () => {
        const instance = await buildInstance();

        // try non-existent token
        await truffleAssert.fails(instance.ownerOf(0));

        // mint
        await instance.mint(accounts[0], 10, true, false);
        assert.equal(await instance.ownerOf(9), accounts[0]);

        await instance.mint(accounts[1], 2, true, false);
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

        await instance.mint(accounts[0], 10, true, false);

        assert.equal(await instance.tokenURI(9), 'uri/9');
        assert.equal(await instance.tokenURI(0), 'uri/0');
        await truffleAssert.fails(instance.tokenURI(10));
    });

    it('calls approve', async () => {
        const instance = await buildInstance();

        // fails on nonexistent token
        await truffleAssert.fails(instance.approve(accounts[1], 0));

        // mint
        await instance.mint(accounts[0], 10, true, false);

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
        await instance.mint(accounts[0], 10, true, false);

        // approve
        await instance.approve(accounts[1], 0);
        await instance.approve(accounts[2], 1);
        assert.equal(await instance.getApproved(0), accounts[1]);
        assert.equal(await instance.getApproved(1), accounts[2]);
        assert.equal(
            await instance.getApproved(2),
            '0x0000000000000000000000000000000000000000'
        );
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

    it.only('calls transferFrom', async () => {
        const notReciever = await ERC721GAC.new('', '', '');

        const instance = await buildInstance();

        // fails if token does not exist
        await truffleAssert.fails(
            instance.transferFrom(accounts[0], accounts[1], 0)
        );

        await instance.mint(accounts[0], 10, true, false);

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
            instance.transferFrom(
                accounts[0],
                '0x0000000000000000000000000000000000000000',
                0
            )
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
    });
});
