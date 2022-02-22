import BN from 'bn.js';

module.exports = (artifacts: Truffle.Artifacts, web3: Web3) => {
    const ShroomiesContract = artifacts.require('Shroomies');
    const SignerContract = artifacts.require('VerifySignature');

    return async (deployer: Truffle.Deployer) => {
        const now = Math.floor(Date.now() / 1000);
        const later = now + 90;
        const muchLater = now + 10 ** 8;

        const signer = web3.eth.accounts.privateKeyToAccount(
            process.env.signer_private as string
        );

        deployer.deploy(SignerContract);
        deployer.link(SignerContract, ShroomiesContract);
        // NOTE: current price is a few decimals smaller than final launch
        deployer.deploy(
            ShroomiesContract,
            8888,
            8000,
            4,
            new BN('380000000000000'),
            signer.address,
            now,
            muchLater,
            later
        );
    };
};
