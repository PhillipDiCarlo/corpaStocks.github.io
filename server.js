require("dotenv").config();
const initBot = require("./TwitchConnect");
const path = require("path");

const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);

app.use(
  express.static(path.join(__dirname, "client"), {
    cacheControl: false,
  })
);

async function main() {
  initBot();
  server.listen(process.env.PORT || 3000, () => {
    console.log("Listening on http://localhost:3000/");
  });
}

main();
