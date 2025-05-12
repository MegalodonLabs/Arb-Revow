const hre = require("hardhat");

async function main() {
  const RevowRegistry = await hre.ethers.getContractFactory("RevowRegistry");
  const registry = await RevowRegistry.deploy();
  await registry.deployed();
  console.log("RevowRegistry deployed to:", registry.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
