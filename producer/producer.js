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

// Register event listeners in a function
function registerEventListeners() {
  const noticeSentEvent = contract.events.NoticeSent();

  noticeSentEvent.on('data', event => {
    const { status, noticeID, gsmNumber } = event.returnValues;

    console.log(`Producer received NoticeSent event:
      Status: ${status}, NoticeID: ${noticeID}, GSM Number: ${gsmNumber}`);
  });
}

// Function to send a notice by calling the smart contract method
async function sendNotice(noticeData, noticeID, gsmNumber) {
  const tx = contract.methods.sendNoticeData(noticeData, noticeID, gsmNumber);
  const gas = await tx.estimateGas({ from: address });
  const gasPriceRaw = await web3.eth.getGasPrice();
  const gasPrice = Math.floor(Number(gasPriceRaw) * 1.2);
  const nonce = await web3.eth.getTransactionCount(address, 'pending');

  const txData = {
    from: address,
    to: contractAddress,
    data: tx.encodeABI(),
    gas,
    nonce,
    gasPrice,
  };

  const signedTx = await web3.eth.accounts.signTransaction(txData, privateKey);
  const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

  //console.log('Producer sent transaction. Receipt:', receipt);
}

// Test code: send three different notices with 5-second intervals
async function testProducer() {
  registerEventListeners();

  const notices = [
    { noticeData: 'Notice 1: System update', noticeID: 1, gsmNumber: 1234567890 },
    { noticeData: 'Notice 2: Maintenance scheduled', noticeID: 2, gsmNumber: 2345678901 },
    { noticeData: 'Notice 3: Outage alert', noticeID: 3, gsmNumber: 3456789012 }
  ];

  for (const notice of notices) {
    console.log(`Producer sending: ${notice.noticeData}`);

    await sendNotice(notice.noticeData, notice.noticeID, notice.gsmNumber);
    
    // wait 5 seconds between notices
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

testProducer();
