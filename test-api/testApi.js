// testApi.js
import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';

const URL_COUNT = 100;
const urlBucket = [];

const app = express();
app.use(bodyParser.json());

app.post('/sms/send/rest/v1', async (req, res) => {
  console.log('Test API received request:', req.body);

  // generate a random jobID
  const jobid = Math.floor(Math.random() * 10000000000);

  res.json({
    code: "00",
    jobid: jobid,
    description: "queued"
  });

  // wait two seconds to send the sent status
  await new Promise(resolve => setTimeout(resolve, 2000));

  axios.post("http://localhost:8080/sms-status", {
    code: "01",
    jobid: jobid,
    description: "sent"
  }).catch(console.error);

  // save URL for test get requests
  const smsText = req.body.messages?.[0]?.msg || "";
  const linkMatch = smsText.match(/https?:\/\/\S+/);
  if (linkMatch) {
    urlBucket.push(linkMatch[0]);
    console.log(`queued link (${urlBucket.length}/${URL_COUNT})`);

    if (urlBucket.length >= URL_COUNT) {
      processQueuedUrls();
    }
  }
});

// test function to send get request to all received urls for a predefined url count
async function processQueuedUrls() {
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log(`Starting simulated clicks for ${urlBucket.length} URLs`);

  for (const link of urlBucket) {
    console.log(`GET ${link}`);

    try {
      await axios.get(link);

      console.log("clicked OK");
    } catch (e) {
      console.error("click failed:", e.message);
    }
  }

  urlBucket.length = 0;
}

const PORT = 8081;
app.listen(PORT, () => {
  console.log(`Test API server is running on port ${PORT}`);
});
