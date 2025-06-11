// testApi.js
import express from 'express';
import bodyParser from 'body-parser';
//canım sevgilim canım sevgilim
//ben sevgilimi cok seviyorum
//kalp kalp kalp
//ask
const app = express();
app.use(bodyParser.json());

app.post('/sms/send/rest/v1', (req, res) => {
  console.log('Test API received request:', req.body);

  // generate a random jobID
  const jobid = Math.floor(Math.random() * 10000000000);
  res.json({
    code: "00",
    jobid: jobid,
    description: "queued"
  });
});

const PORT = 8081;
app.listen(PORT, () => {
  console.log(`Test API server is running on port ${PORT} with love`);
});
