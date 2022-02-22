module.exports = (artifacts: Truffle.Artifacts) => {
  const Migrations = artifacts.require("Migrations");
  return async (
    deployer: Truffle.Deployer,
  ) => {
    deployer.deploy(Migrations);
  }
}