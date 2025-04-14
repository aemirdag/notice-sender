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
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "blockTime",
        "type": "uint256"
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
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "blockTime",
        "type": "uint256"
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

const contractAddress = "0xcBeFE1e741107E9DEB35d2E3564D4A0548841DCD";
const contract = new web3.eth.Contract(CONTRACT_ABI, contractAddress);

const privateKey = `${process.env.SEPOLIA_PRIVATE_KEY}`;
const address = `${process.env.SEPOLIA_WALLET_ADDRESS}`;

// Object to record when each notice is sent (keyed by noticeID)
const noticeTimestamps = {};
// Array to store the response durations for each notice
const responseDurations = [];
// test notices
const notices = [];
// response time test size
const numOfTests = 5;

// Register event listeners in a function
function registerEventListeners() {
  const noticeSentEvent = contract.events.NoticeSent();

  noticeSentEvent.on('data', event => {
    const { status, noticeID, gsmNumber, blockTime } = event.returnValues;

    console.log(`Producer received NoticeSent event: Status: ${status}, NoticeID: ${noticeID}, GSM Number: ${gsmNumber}, blockTime: ${blockTime}`);

    // Calculate the response time if the notice timestamp exists
    if (noticeTimestamps[noticeID]) {
      const receivedTime = Date.now();
      const eventDelay = BigInt(receivedTime) - blockTime*BigInt(1000); // miliseconds
      const duration = Date.now() - noticeTimestamps[noticeID];
      responseDurations.push(duration);

      console.log(`NoticeID ${noticeID} response time: ${duration} ms, event delay: ${eventDelay} ms`);
      
      // if each response is received for each notice, take average
      if (responseDurations.length === notices.length) {
        console.log(`Response Time Summary: [`);
        for (const notice of notices) {
          console.log(`Notice ID: ${notice.noticeID}, Data Length: ${notice.dataLength}, Response Time: ${responseDurations[notice.noticeID - 1]}`);
        }
        console.log(`]`);

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

  const tx = contract.methods.sendNoticeData(noticeData, noticeID, gsmNumber);
  const gas = await tx.estimateGas({ from: address });
  const gasPriceRaw = await web3.eth.getGasPrice();
  const gasPrice = Math.floor(Number(gasPriceRaw) * 1.2);
  const nonceToUse = await web3.eth.getTransactionCount(address, 'pending');

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

  //console.log(
  //  `NoticeID ${noticeID}, Data Length: ${noticeData.length}, Block Number: ${receipt.blockNumber}, Block Size: ${block.size} bytes`
  //);

  return {
    usedGas: receipt.gasUsed,
    blockSize: null,
  }; 
}

function generateRandomGsmNumber() {
  // Generates a number between 1000000000 and 9999999999
  return Math.floor(Math.random() * 9000000000) + 1000000000;
}

// Test code: send three different notices with 5-second intervals
async function testResponseTime() {
  registerEventListeners();

  // generate numOfTests test notice
  for (let i = 0; i < numOfTests; i++) {
    const noticeData = `Notice ${i + 1}: This is notice ${i + 1}.`;
    notices.push({
      noticeData: noticeData,
      noticeID: i + 1,
      gsmNumber: generateRandomGsmNumber(),
      dataLength: noticeData.length,
    });
  }

  for (const notice of notices) {
    console.log(`Producer sending notice ID: ${notice.noticeID}`);

    await sendNotice(notice.noticeData, notice.noticeID, notice.gsmNumber);
    
    // wait 5 seconds between notices to remove "replacement transaction underpriced" error
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

/**
 * Test function that sends notices with increasing notice data lengths
 * and collects the gas consumption for each.
 */
async function testGasWithIncreasingData() {
  registerEventListeners();

  // Array of different data lengths to test
  const dataLengths = [];
  for (let i = 1; i <= numOfTests; i++) {
    dataLengths.push(i * 100);
  }

  const gasMetrics = [];
  let noticeID = 1;

  for (const length of dataLengths) {
    // Generate a notice string consisting of repeated 'A' characters.
    const noticeData = 'A'.repeat(length);

    notices.push({
      noticeData: noticeData,
      noticeID: noticeID,
      gsmNumber: generateRandomGsmNumber(),
      dataLength: length,
    });

    noticeID++;
  }
  
  for (const notice of notices) {
    console.log(`Producer sending notice ID: ${notice.noticeID}`);

    const receiptData = await sendNotice(notice.noticeData, notice.noticeID, notice.gsmNumber);

    gasMetrics.push({ noticeID: notice.noticeID, dataLength: notice.dataLength, usedGas: receiptData.usedGas });

    // wait 5 seconds between notices to remove "replacement transaction underpriced" error
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  
  console.log('Gas Metrics Summary:', gasMetrics);
}

/**
 * Test function that sends notices with increasing data sizes
 * and collects the block sizes.
 */
async function testBlockSizeWithIncreasingData() {
  registerEventListeners();
  // Array of different data lengths to test
  const dataLengths = [100, 200, 500, 1000, 2000, 3000, 4000, 5000, 6000, 10000];
  const blockSizeMetrics = [];
  let noticeID = 1;
  
  for (const length of dataLengths) {
    // Generate a notice string consisting of repeated 'A' characters.
    const noticeData = 'A'.repeat(length);
    const receiptData = await sendNotice(noticeData, noticeID, 1234567890);
    blockSizeMetrics.push({ noticeID, dataLength: length, blockSize: receiptData.blockSize });
    noticeID++;
    // wait 5 seconds between notices to remove "replacement transaction underpriced" error
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  
  console.log('Block Size Metrics Summary:', blockSizeMetrics);
}

testResponseTime();
//testGasWithIncreasingData();
//testBlockSizeWithIncreasingData();
