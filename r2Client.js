// r2Client.js
const { S3Client } = require("@aws-sdk/client-s3");

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://faf40728321a0253f6f852aa6ad4bf18.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: "446e46b6f3837177bd5be8b66905b959",
    secretAccessKey: "aedac3868cbafddf87f40e2ad4e7e2e6d45e4cc5de56ef58019ad0feb7bd3b15",
  },
});

module.exports = r2;
