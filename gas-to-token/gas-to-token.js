/**
 * Converts gas cost to ETH.
 * @param {number} gas - The gas limit of the transaction.
 * @param {number} gwei - The gas price in gwei.
 * @returns {number} - The cost in ETH.
 */
function gasToEth(gas, gwei) {
  // 1 gwei = 10^-9 ETH
  return gas * gwei * 1e-9;
}

/**
 * Prints the list of calculated token costs along with their USD equivalents and blockchain info.
 * @param {number[]} costs - The list of calculated token costs.
 * @param {number} usdPerToken - The USD value for one token.
 * @param {string} tokenName - The name of the token.
 * @param {string} blockchain - The name of the blockchain.
 */
function printEthCosts(costs, usdPerToken, tokenName, blockchain) {
    console.log(`Calculated ${tokenName} Costs on ${blockchain}:`);
    costs.forEach((cost, index) => {
      const usdCost = cost * usdPerToken;
      console.log(`Gas ${index + 1}: ${cost.toFixed(8)} ${tokenName} (${usdCost.toFixed(5)} USD)`);
    });
}

// Example list of gas limits (e.g., for different transactions)
const gasList = [29969, 32339, 39462, 51704, 75801, 99901, 124006, 148504, 172616, 269493];

// Ethereum Mainnet
// Given gas price in gwei
let gweiPrice = 1.457; // 19.02.2025, https://etherscan.io/
// zorttt
// Given usd for the related token
let tokenToUsd = 2714.09; // 19.02.2025
// Calculate the ETH cost for each gas limit
let ethCosts = gasList.map(gas => gasToEth(gas, gweiPrice));
// Call the printing function with the list of ETH costs
printEthCosts(ethCosts, tokenToUsd, "ETH", "Ethereum Mainnet");

// BNB Smart Chain Mainnet (BSC)
// Given gas price in gwei
gweiPrice = 1; // 19.02.2025, https://bscscan.com/gastracker
// Given usd for the related token
tokenToUsd = 655.62; // 19.02.2025
// Calculate the ETH cost for each gas limit
ethCosts = gasList.map(gas => gasToEth(gas, gweiPrice));
// Call the printing function with the list of ETH costs
printEthCosts(ethCosts, tokenToUsd, "BNB", "BNB Smart Chain Mainnet");

// Arbitrum One and Nova
// Given gas price in gwei
gweiPrice = 0.01; // 19.02.2025, https://docs.arbitrum.io/how-arbitrum-works/gas-fees
// Given usd for the related token
tokenToUsd = 2714.09; // 19.02.2025
// Calculate the ETH cost for each gas limit
ethCosts = gasList.map(gas => gasToEth(gas, gweiPrice));
// Call the printing function with the list of ETH costs
printEthCosts(ethCosts, tokenToUsd, "ETH", "Arbitrum One and Nova");

// Polygon Mainnet
// Given gas price in gwei
gweiPrice = 26.16; // 19.02.2025, https://polygonscan.com/gastracker
// Given usd for the related token
tokenToUsd = 0.30; // 19.02.2025
// Calculate the ETH cost for each gas limit
ethCosts = gasList.map(gas => gasToEth(gas, gweiPrice));
// Call the printing function with the list of ETH costs
printEthCosts(ethCosts, tokenToUsd, "POL", "Polygon Mainnet");

// Avalanche
// Given gas price in gwei
gweiPrice = 1.50; // 19.02.2025, standard, https://snowtrace.io/gastracker
// Given usd for the related token
tokenToUsd = 23.64; // 19.02.2025
// Calculate the ETH cost for each gas limit
ethCosts = gasList.map(gas => gasToEth(gas, gweiPrice));
// Call the printing function with the list of ETH costs
printEthCosts(ethCosts, tokenToUsd, "AVAX", "Avalanche");

// OP Mainnet
// Given gas price in gwei
gweiPrice = 0.0010; // 19.02.2025, https://tokentool.bitbond.com/gas-price/optimism
// Given usd for the related token
tokenToUsd = 2714.09; // 19.02.2025
// Calculate the ETH cost for each gas limit
ethCosts = gasList.map(gas => gasToEth(gas, gweiPrice));
// Call the printing function with the list of ETH costs
printEthCosts(ethCosts, tokenToUsd, "ETH", "OP Mainnet");

// Fantom Opera
// Given gas price in gwei
gweiPrice = 1.5452; // 19.02.2025, normal, https://ftmscan.com/
// Given usd for the related token
tokenToUsd = 0.718924; // 19.02.2025
// Calculate the ETH cost for each gas limit
ethCosts = gasList.map(gas => gasToEth(gas, gweiPrice));
// Call the printing function with the list of ETH costs
printEthCosts(ethCosts, tokenToUsd, "FTM", "Fantom Opera");

// Cronos EVM
// Given gas price in gwei
gweiPrice = 4545; // 19.02.2025, normal, https://cronos.org/gastracker
// Given usd for the related token
tokenToUsd = 0.08396; // 19.02.2025
// Calculate the ETH cost for each gas limit
ethCosts = gasList.map(gas => gasToEth(gas, gweiPrice));
// Call the printing function with the list of ETH costs
printEthCosts(ethCosts, tokenToUsd, "CRO", "Cronos EVM");

// Gnosis
// Given gas price in gwei
gweiPrice = 1; // 19.02.2025, fast, https://gnosisscan.io/gastracker
// Given usd for the related token
tokenToUsd = 1; // 19.02.2025
// Calculate the ETH cost for each gas limit
ethCosts = gasList.map(gas => gasToEth(gas, gweiPrice));
// Call the printing function with the list of ETH costs
printEthCosts(ethCosts, tokenToUsd, "xDAI", "Gnosis");

// Moonbeam Chain
// Given gas price in gwei
gweiPrice = 31.25; // 19.02.2025, fast, https://moonscan.io/gastracker
// Given usd for the related token
tokenToUsd = 0.13; // 19.02.2025
// Calculate the ETH cost for each gas limit
ethCosts = gasList.map(gas => gasToEth(gas, gweiPrice));
// Call the printing function with the list of ETH costs
printEthCosts(ethCosts, tokenToUsd, "GLMR", "Moonbeam Chain");
