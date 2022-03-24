module.exports = (artifacts: Truffle.Artifacts, web3: Web3) => {
    const GAC = artifacts.require('GamingApeClub');
    return async (deployer: Truffle.Deployer) => {
        const accounts = await web3.eth.getAccounts();
        return deployer.deploy(
            GAC,
            accounts[0],
            6550,
            1,
            6050,
            '80000000000000000',
            Math.floor(Date.now() / 1000),
            Math.floor(Date.now() / 1000) + 60 * 60 * 1, // 1 hr from now
            Math.floor(Date.now() / 1000) + 60 * 60 * 2, // 2 hr from now
            Math.floor(Date.now() / 1000),
            'https://cc_nftstore.mypinata.cloud/ipfs/QmQP8AsBUuXkNGVr9Q9ojC2Ua6rzgUSGj9qA2zxaoGRkuL/'
        );
    };
};
