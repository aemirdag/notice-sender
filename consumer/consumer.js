import { Web3, WebSocketProvider } from 'web3';
import axios from 'axios';
import dotenv from 'dotenv';
import crypto from "crypto";
import express from 'express';

dotenv.config();

const app = express();
app.use(express.json());

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

// the API URL
const apiUrl = process.env.API_URL;
// An authentication key to include in the POST request, if needed
const authKey = process.env.API_AUTH_KEY;

// object to record when each notice is sent
const noticeTimestamps = {};
// array to store the function call delays for each notice
const eventDelays = [];
// array to store the function call delays for each notice
const functionCallDelays = [];
// array to store the received notice IDs
const receivedNoticeIDs = [];
// map to store URLs' generated for the corresponding notice IDs
const urlMap = new Map();
// map to store jobIDs' generated for the corresponding notice IDs
const jobIdMap = new Map();
// map to store noticeIDs' generated for the corresponding job IDs
const noticeIdMap = new Map();

// response time test size
const numOfTests = 100;

// subscribe once at start-up
const newHeads$ = await web3.eth.subscribe('newBlockHeaders');

const blockSeenTime = new Map();

newHeads$.on('data', hdr => {
    blockSeenTime.set(hdr.number, Date.now());
});

// helper to build deterministic link
function buildClickLink(noticeID) {
  const secret = process.env.LINK_SECRET;
  const token  = crypto                              
        .createHash('sha256')
        .update(secret + String(noticeID))
        .digest('hex')
        .slice(0, 12);
  return `http://localhost:8080/v/${noticeID}-${token}`;
}

// register event listener for NoticeData events (sent from the contract)
function registerConsumerEventListeners() {
  const noticeDataEvent = contract.events.NoticeData();
  const updateNoticeStatusFunctionCallReceivedEvent = contract.events.UpdateNoticeStatusFunctionCallReceived();

  noticeDataEvent.on('data', event => {
    const { noticeData, noticeID, gsmNumber } = event.returnValues;

    console.log(`Consumer received NoticeData event: noticeData: notice-data-test, noticeID: ${noticeID}, gsmNumber: ${gsmNumber}`);
    
    handleNoticeDataEvent(noticeData, noticeID, gsmNumber, event.blockNumber);
  });

  updateNoticeStatusFunctionCallReceivedEvent.on('data', event => {
    const { noticeID } = event.returnValues;
    
    handleFunctionCallDelayEvent(noticeID, event.blockNumber);
  });
}

// when a notice is received, call the API via HTTP POST and then update the contract
async function handleNoticeDataEvent(noticeData, noticeID, gsmNumber, block) {
  try {    
    const headerMs = blockSeenTime.get(block);
    const receivedTime = Date.now();
    const eventDelay = receivedTime - headerMs; // miliseconds
    console.log(`NoticeID ${noticeID} event delay: ${eventDelay} ms`);
    eventDelays.push(eventDelay);
    receivedNoticeIDs.push(noticeID);

    if (eventDelays.length === numOfTests) {
      console.log(`Event Delay Summary: [`);
      for (const noticeID of receivedNoticeIDs) {
        console.log(`Notice ID: ${noticeID}, Event Delay: ${eventDelays[noticeID - 1n]}`);
      }
      console.log(`]`);

      const totalEventDelay = eventDelays.reduce((acc, val) => acc + val, 0);
      const avgEventDelay = totalEventDelay / eventDelays.length;

      console.log(`Average event delay time: ${avgEventDelay} ms`);
    }

    const clickLink = buildClickLink(noticeID);
    urlMap.set(Number(noticeID), clickLink ?? "aaaa");
    const smsBody   = `${noticeData}\nView: ${clickLink}`;

    // prepare the data for the API request
    const data = {
      msgheader: authKey,
      messages: [
        {
          msg: smsBody,
          no: gsmNumber.toString()
        }
      ],
      encoding: "TR",
      iysfilter: "",
      partnercode: ""
    };

    // make the POST request to the API
    const response = await axios.post(apiUrl, data, {
      headers: { "Content-Type": "application/json" }
    });

    console.log(`Consumer received API response: ${JSON.stringify(response.data)}`);

    // API returns a jobid (as a string of digits) and a code
    const jobID = Number(response.data.jobid);
    jobIdMap.set(Number(noticeID), jobID)
    noticeIdMap.set(jobID, Number(noticeID));

    let status = 4;
    if (response.data.code === "00") { // queued
      status = 0;
    }

    // call the smart contract to update notice status with the API response
    const usedGas = await updateNoticeStatus(noticeID, jobID, status, 0);

    console.log("Gas used in transaction: ", usedGas);
  } catch (error) {
    console.error("Consumer encountered an error while handling notice:", error);
  }
}

app.post("/sms-status", async (req, res) => {
  try {
    const { code, jobid, description} = req.body;
    const noticeID = noticeIdMap.get(Number(jobid));

    let status = 4;
    if (code === "01") { // sent
      status = 1;
    }

    const usedGas = await updateNoticeStatus(noticeID, Number(jobid), status, 0);

    console.log("Gas used in transaction: ", usedGas);

    res.sendStatus(204);
  } catch (err) {
    console.error("callback error:", err);
    res.status(500).send("error");
  }
});

app.get('/v/:token', async (req, res) => {
  const clickMs = Date.now();
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;  
  const [idStr] = req.params.token.split("-"); // noticeID is prefix
  const noticeID = Number(idStr);

  // verify the link matches what was sent
  const expected = urlMap.get(noticeID);
  if (expected && expected === fullUrl) {
      console.log(`Link verified for notice ${noticeID}`);
      
      const jobID = jobIdMap.get(noticeID);

      const usedGas = await updateNoticeStatus(noticeID, jobID, 2, clickMs); // 2 = Read

      console.log("Gas used in transaction: ", usedGas);

      res.status(204).send("Notice read confirmed");
  } else {
      console.warn(`Invalid or unknown link for notice ${noticeID}`);
      res.status(404).send("Invalid link");
  }
});
app.listen(8080);

// when a notice is received, call the API via HTTP POST and then update the contract
async function handleFunctionCallDelayEvent(noticeID, block) {
  const headerMs = blockSeenTime.get(block);
  const sendTime = noticeTimestamps[noticeID];
  const functionCallDelay = headerMs - sendTime; // milliseconds
  console.log(`NoticeID ${noticeID}, function call delay: ${functionCallDelay} ms`);
  functionCallDelays.push(functionCallDelay);

  // if each function call delay is received for each notice, take average
  if (functionCallDelays.length === numOfTests) {
    console.log(`Function Call Delay Summary: [`);
    for (const noticeID of receivedNoticeIDs) {
      console.log(`Notice ID: ${noticeID}, Function Call Delay: ${functionCallDelays[noticeID - 1n]}`);
    }
    console.log(`]`);

    const totalFunctionCallDelay = functionCallDelays.reduce((acc, val) => acc + val, 0);
    const avgFunctionCallDelay = totalFunctionCallDelay / functionCallDelays.length;

    console.log(`Average function call delay time: ${avgFunctionCallDelay} ms`);
  }
}

// function to call the contract’s updateNoticeStatus method
async function updateNoticeStatus(noticeID, jobID, status, clickMs) {
  noticeTimestamps[noticeID] = Date.now();

  const tx = contract.methods.updateNoticeStatus(noticeID, jobID, status, clickMs);
  const gas = await tx.estimateGas({ from: address });
  const gasPriceRaw = await web3.eth.getGasPrice();
  const gasPrice = Math.floor(Number(gasPriceRaw) * 1.2); // because of the "replacement transaction underpriced" error
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

  //console.log('Consumer updateNoticeStatus transaction receipt:', receipt);

  return receipt.gasUsed;
}

registerConsumerEventListeners();
