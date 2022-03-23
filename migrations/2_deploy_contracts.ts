module.exports = (artifacts: Truffle.Artifacts, web3: Web3) => {
    const GAC = artifacts.require('GamingApeClub');
    return async (deployer: Truffle.Deployer) => {
        const accounts = await web3.eth.getAccounts();
        return deployer.deploy(
            GAC,
            accounts[0],
            100,
            1,
            60,
            '100000000000000000',
            Math.floor(Date.now() / 1000),
            Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 15, // 15 days from now
            Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days from now
            Math.floor(Date.now() / 1000),
            'test/'
        );
    };
};
