import { Web3, WebSocketProvider } from 'web3';
import dotenv from 'dotenv';
dotenv.config();

const web3 = new Web3(new WebSocketProvider(`wss://sepolia.infura.io/ws/v3/${process.env.INFURA_API_KEY}`));

const CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "noticeData",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "noticeID",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "gsmNumber",
        "type": "uint64"
      }
    ],
    "name": "NoticeData",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "status",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "noticeID",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "gsmNumber",
        "type": "uint64"
      }
    ],
    "name": "NoticeSent",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "noticeData",
        "type": "string"
      },
      {
        "internalType": "uint64",
        "name": "noticeID",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "gsmNumber",
        "type": "uint64"
      }
    ],
    "name": "sendNoticeData",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "noticeID",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "jobID",
        "type": "uint64"
      },
      {
        "internalType": "uint8",
        "name": "status",
        "type": "uint8"
      }
    ],
    "name": "updateNoticeStatus",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const contractAddress = "0xfD463C307Af7931cd9681563BDe8857f56f72BF4";
const contract = new web3.eth.Contract(CONTRACT_ABI, contractAddress);

const privateKey = `${process.env.SEPOLIA_PRIVATE_KEY}`;
const address = `${process.env.SEPOLIA_WALLET_ADDRESS}`;

// Object to record when each notice is sent (keyed by noticeID)
const noticeTimestamps = {};
// Array to store the response durations for each notice
const responseDurations = [];
// Global variable to track nonce
let localNonce = null;

/**
 * Syncs the localNonce with the chain's pending transaction count.
 * Called periodically (e.g., on new blocks or after a reorg).
 */
async function syncNonceWithChain() {
  try {
    const chainNonce = await web3.eth.getTransactionCount(address, 'pending');
    localNonce = chainNonce;
    console.log(`Synced local nonce with chain: ${localNonce}`);
  } catch (error) {
    console.error('Error syncing nonce with chain:', error);
  }
}

// Register event listeners in a function
function registerEventListeners() {
  const noticeSentEvent = contract.events.NoticeSent();

  noticeSentEvent.on('data', event => {
    const { status, noticeID, gsmNumber } = event.returnValues;

    console.log(`Producer received NoticeSent event:
      Status: ${status}, NoticeID: ${noticeID}, GSM Number: ${gsmNumber}`);

    // Calculate the response time if the notice timestamp exists
    if (noticeTimestamps[noticeID]) {
      const duration = Date.now() - noticeTimestamps[noticeID]; // remove delay
      responseDurations.push(duration);
      console.log(`NoticeID ${noticeID} response time: ${duration} ms`);
      
      // For test purposes: if we expect 5 responses, calculate the average once all are received
      if (responseDurations.length === 5) {
        const total = responseDurations.reduce((acc, val) => acc + val, 0);
        const avg = total / responseDurations.length;
        console.log(`Average response time: ${avg} ms`);
      }
    }
  });
}

// Function to send a notice by calling the smart contract method
async function sendNotice(noticeData, noticeID, gsmNumber) {
  // Record the current time when sending the notice
  noticeTimestamps[noticeID] = Date.now();

  // Ensure localNonce is synced before using it.
  await syncNonceWithChain();

  const tx = contract.methods.sendNoticeData(noticeData, noticeID, gsmNumber);
  const gas = await tx.estimateGas({ from: address });
  const gasPriceRaw = await web3.eth.getGasPrice();
  const gasPrice = Math.floor(Number(gasPriceRaw) * 1.2);
  // Use our tracked localNonce.
  const nonceToUse = localNonce;
  // Increment our localNonce for the next transaction.
  localNonce++;

  const txData = {
    from: address,
    to: contractAddress,
    data: tx.encodeABI(),
    gas,
    nonce: nonceToUse,
    gasPrice,
  };

  const signedTx = await web3.eth.accounts.signTransaction(txData, privateKey);
  const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

  // Retrieve the block in which the transaction was included
  const block = await web3.eth.getBlock(receipt.blockNumber);

  //console.log('Producer sent transaction. Receipt:', receipt);

  console.log(
    `NoticeID ${noticeID}, Data Length: ${noticeData.length}, Gas Used: ${receipt.gasUsed}`
  );

  console.log(
    `NoticeID ${noticeID}, Data Length: ${noticeData.length}, Block Number: ${receipt.blockNumber}, Block Size: ${block.size} bytes`
  );

  return {
    usedGas: receipt.gasUsed,
    blockSize: block.size,
  }; 
}

// Test code: send three different notices with 5-second intervals
async function testProducer() {
  registerEventListeners();

  const notices = [
    { noticeData: 'Notice 1: This is notice 1.', noticeID: 1, gsmNumber: 1234567890 },
    { noticeData: 'Notice 2: This is notice 2.', noticeID: 2, gsmNumber: 2345678901 },
    { noticeData: 'Notice 3: This is notice 3.', noticeID: 3, gsmNumber: 3456789012 },
    { noticeData: 'Notice 4: This is notice 4.', noticeID: 4, gsmNumber: 5326789643 },
    { noticeData: 'Notice 5: This is notice 5.', noticeID: 5, gsmNumber: 7656589237 },
  ];

  for (const notice of notices) {
    console.log(`Producer sending: ${notice.noticeData}`);

    await sendNotice(notice.noticeData, notice.noticeID, notice.gsmNumber);
    
    // wait 1 seconds between notices to remove "replacement transaction underpriced" error
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * Test function that sends notices with increasing notice data lengths
 * and collects the gas consumption for each.
 */
async function testGasMetricWithIncreasingData() {
  // Array of different data lengths to test
  const dataLengths = [10, 50, 100, 500, 1000, 5000];
  const gasMetrics = [];
  let noticeID = 1;
  
  for (const length of dataLengths) {
    // Generate a notice string consisting of repeated 'A' characters.
    const noticeData = 'A'.repeat(length);
    const {gasUsed, _} = await sendNotice(noticeData, noticeID, 1234567890);
    gasMetrics.push({ noticeID, dataLength: length, gasUsed });
    noticeID++;

    // wait 1 seconds between notices to remove "replacement transaction underpriced" error
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  
  console.log('Gas Metrics Summary:', gasMetrics);
}

/**
 * Test function that sends notices with increasing data sizes
 * and collects the block sizes.
 */
async function testBlockSizeWithIncreasingData() {
  // Array of different data lengths to test
  const dataLengths = [10, 50, 100, 500, 1000, 5000];
  const blockSizeMetrics = [];
  let noticeID = 1;
  
  for (const length of dataLengths) {
    // Generate a notice string consisting of repeated 'A' characters.
    const noticeData = 'A'.repeat(length);
    const {_, blockSize} = await sendNotice(noticeData, noticeID, 1234567890);
    blockSizeMetrics.push({ noticeID, dataLength: length, blockSize });
    noticeID++;
    // wait 1 seconds between notices to remove "replacement transaction underpriced" error
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  
  console.log('Block Size Metrics Summary:', blockSizeMetrics);
}

//testProducer();
//testGasMetricWithIncreasingData();
testBlockSizeWithIncreasingData();
