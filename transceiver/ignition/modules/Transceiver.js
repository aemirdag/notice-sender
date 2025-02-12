const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("TransceiverContract", (m) => {
  const transceiverContract = m.contract("Transceiver", []);

  return { transceiverContract };
});
