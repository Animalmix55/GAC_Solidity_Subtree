module.exports = (artifacts: Truffle.Artifacts, web3: Web3) => {
    const GAC = artifacts.require('GamingApeClub');
    return async (deployer: Truffle.Deployer) => {
        const accounts = await web3.eth.getAccounts();
        return deployer.deploy(
            GAC,
            accounts[0],
            100,
            1,
            '100000000000000000',
            0,
            Date.now() * 10,
            0,
            'test/'
        );
    };
};
