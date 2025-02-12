const hre = require("hardhat");

async function main() {
    const Transceiver = await hre.ethers.getContractFactory("Transceiver");
    const transceiver = await Transceiver.deploy();

    await transceiver.deployed();

    console.log("Transceiver deployed to:", transceiver.address);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
