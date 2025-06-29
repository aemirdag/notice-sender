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
        "internalType": "enum Transceiver.NoticeStatusEnum",
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
        "name": "clientTsMs",
        "type": "uint256"
      }
    ],
    "name": "NoticeStatusUpdate",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "noticeID",
        "type": "uint64"
      }
    ],
    "name": "SendNoticeDataFunctionCallReceived",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "noticeID",
        "type": "uint64"
      }
    ],
    "name": "UpdateNoticeStatusFunctionCallReceived",
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
        "internalType": "enum Transceiver.NoticeStatusEnum",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "clientTsMs",
        "type": "uint256"
      }
    ],
    "name": "updateNoticeStatus",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const contractAddress = "0x37ec300a584722001D4983bE3A24e79672253F54";
const contract = new web3.eth.Contract(CONTRACT_ABI, contractAddress);

const privateKey = `${process.env.SEPOLIA_PRIVATE_KEY}`;
const address = `${process.env.SEPOLIA_WALLET_ADDRESS}`;

// object to record when each notice is sent
const noticeTimestamps = {};
// array to store the response durations for each notice
const responseDurations = [];
// array to store the function call delays for each notice
const eventDelays = [];
// array to store the function call delays for each notice
const functionCallDelays = [];
// test notices
const notices = [];
// array to record delay on received read status
const readDelays = [];
// response time test size
const numOfTests = 100;

// subscribe once at start-up
const newHeads$ = await web3.eth.subscribe('newBlockHeaders');

const blockSeenTime = new Map();

newHeads$.on('data', hdr => {
    blockSeenTime.set(hdr.number, Date.now());
});

// Register event listeners in a function
function registerEventListeners() {
  const noticeStatusUpdateEvent = contract.events.NoticeStatusUpdate();
  const sendNoticeDataFunctionCallReceivedEvent = contract.events.SendNoticeDataFunctionCallReceived();

  noticeStatusUpdateEvent.on('data', event => {
    const { status, noticeID, gsmNumber, clientTsMs } = event.returnValues;

    const nowMs = Date.now();
    let statusStr = "Invalid";
    const statusNum = Number(status);
    if (statusNum === 0) {
      statusStr = "Queued";
    } else if (statusNum === 1) {
      statusStr = "Sent";
    } else if (statusNum === 2) {
      statusStr = "Read";
    }

    console.log(`Producer received NoticeStatusUpdate event: NoticeID: ${noticeID}, Status: ${statusStr}, GSM Number: ${gsmNumber}`);

    // calculate the response time if the notice timestamp exists
    if (noticeTimestamps[noticeID]) {
      const blockNo  = event.blockNumber;
      const headerMs = blockSeenTime.get(blockNo);
      const receivedTime = Date.now();
      const eventDelay = receivedTime - headerMs; // milliseconds
      const duration = Date.now() - noticeTimestamps[noticeID];
      responseDurations.push(duration);
      eventDelays.push(eventDelay);

      console.log(`NoticeID ${noticeID}, response time: ${duration} ms`);
      console.log(`NoticeID ${noticeID}, event delay: ${eventDelay} ms`);
      
      // if each response is received for each notice, take average
      if (responseDurations.length === notices.length) {
        console.log(`Response Time Summary: [`);
        for (const notice of notices) {
          console.log(`Notice ID: ${notice.noticeID}, Data Length: ${notice.dataLength}, Response Time: ${responseDurations[notice.noticeID - 1]}`);
        }
        console.log(`]`);

        const totalResponseDuration = responseDurations.reduce((acc, val) => acc + val, 0);
        const avgResponseDuration = totalResponseDuration / responseDurations.length;

        console.log(`Average response time: ${avgResponseDuration} ms`);

        console.log(`Event Delay Summary: [`);
        for (const notice of notices) {
          console.log(`Notice ID: ${notice.noticeID}, Event Delay: ${eventDelays[notice.noticeID - 1]}`);
        }
        console.log(`]`);

        const totalEventDelay = eventDelays.reduce((acc, val) => acc + val, 0);
        const avgEventDelay = totalEventDelay / eventDelays.length;

        console.log(`Average event delay time: ${avgEventDelay} ms`);
      }
    }

    if (statusStr === "Read") {
      const readDelay = nowMs - Number(clientTsMs);
      readDelays.push({ noticeID, readDelay });

      console.log(`Notice ID: ${noticeID}, Read Response Time: ${readDelay} ms`);

      if (readDelays.length === numOfTests) {
        console.log("Read Response Time Summary: [");
        readDelays.forEach(({ noticeID, readDelay }) =>
          console.log(`Notice ID: ${noticeID}, Read Response Time: ${readDelay} ms`)
        );
        console.log(`]`);

        const avg = readDelays.reduce((acc, o) => acc + o.readDelay, 0) / readDelays.length;

        console.log(`Average read response time: ${avg.toFixed(0)} ms`);
      }
    }
  });

  sendNoticeDataFunctionCallReceivedEvent.on('data', event => {
    const { noticeID } = event.returnValues;

    if (noticeTimestamps[noticeID]) {
      const blockNo  = event.blockNumber;
      const headerMs = blockSeenTime.get(blockNo);
      const sendTime = noticeTimestamps[noticeID];
      const functionCallDelay = headerMs - sendTime; // milliseconds
      console.log(`NoticeID ${noticeID} function call delay: ${functionCallDelay} ms`);
      functionCallDelays.push(functionCallDelay);

      // if each function call delay is received for each notice, take average
      if (functionCallDelays.length === notices.length) {
        console.log(`Function Call Delay Summary: [`);
        for (const notice of notices) {
          console.log(`Notice ID: ${notice.noticeID}, Function Call Delay: ${functionCallDelays[notice.noticeID - 1]}`);
        }
        console.log(`]`);

        const totalFunctionCallDelay = functionCallDelays.reduce((acc, val) => acc + val, 0);
        const avgFunctionCallDelay = totalFunctionCallDelay / functionCallDelays.length;

        console.log(`Average function call delay time: ${avgFunctionCallDelay} ms`);
      }
    }
  });
}

// function to send a notice by calling the smart contract method
async function sendNotice(noticeData, noticeID, gsmNumber) {
  // record the current time when sending the notice
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

  // retrieve the block in which the transaction was included
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

// test code: send three different notices with 5-second intervals
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

// test function that sends notices with increasing notice data lengths
// and collects the gas consumption for each.
async function testGasWithIncreasingData() {
  registerEventListeners();

  // array of different data lengths to test
  const dataLengths = [];
  for (let i = 1; i <= numOfTests; i++) {
    dataLengths.push(i * 100);
  }

  const gasMetrics = [];
  let noticeID = 1;

  for (const length of dataLengths) {
    // generate a notice string consisting of repeated 'A' characters
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

//Test function that sends notices with increasing data sizes
//and collects the block sizes
async function testBlockSizeWithIncreasingData() {
  registerEventListeners();
  // Array of different data lengths to test
  const dataLengths = [100, 200, 500, 1000, 2000, 3000, 4000, 5000, 6000, 10000];
  const blockSizeMetrics = [];
  let noticeID = 1;
  
  for (const length of dataLengths) {
    // Generate a notice string consisting of repeated 'A' characters
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
