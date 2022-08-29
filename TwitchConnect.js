console.info("Twitch Bot Starting");

//Requirements
const tmi = require("tmi.js");
var HashMap = require("hashmap");
const { networkInterfaces } = require("os");

const buyKeywords = ["corpa buy", "buy corpa"];
const sellKeywords = ["corpa sell", "sell corpa"];

//MongoDB connection
var MongoClient = require("mongodb").MongoClient;
var databaseName = "streamerStocks";
var collectionName;
var netWorthMap = new HashMap();

//initial set of streamers worth if collection exists
async function setNetworth(streamer) {
  await getCorpa(streamer).then((tempIPO) => {
    netWorthMap.set(streamer, tempIPO);
  });
}

async function insertCorpa(channel) {
  const mongo = new MongoClient(process.env.MONGO_URL.concat(channel));
  const result = await mongo
    .db(databaseName)
    .collection(channel)
    .insertOne({
      channelId: "#".concat(channel),
      stockName: "$".concat(channel),
      stockPrice: netWorthMap.get(channel),
      //timestamp: new Date().toISOString(),
      timestamp: Math.round(Date.now() / 1000),
    });
}

async function initialIPO(client, streamerName, newInsert) {
  const result = await client
    .db(databaseName)
    .collection(streamerName)
    .insertOne(newInsert);
  console.info("IPO Created for: ".concat(streamerName));
}

//get stonk price
async function getCorpa(channelName) {
  var client = new MongoClient(process.env.MONGO_URL.concat(channelName));
  client.connect();
  const db = client.db(databaseName);
  const collection = db.collection(channelName);
  const cursor = collection.find().sort("timestamp", -1).limit(1);
  const item = await cursor.next();
  const finalItem = item.stockPrice;
  return finalItem;
}

const twitchClient = new tmi.Client({
  options: { debug: true },
  identity: {
    username: process.env.TWITCH_BOT_USERNAME,
    password: process.env.TWITCH_OAUTH_TOKEN,
  },
  // Channels to watch
  channels: ["Italiandogs", "mizkif"], //TODO Potentially move to database
});

twitchClient.connect();

twitchClient.on("message", (channel, tags, message, self) => {
  // Ignore echoed messages.
  if (self) return;

  // Add Corpa Value
  if (buyKeywords.includes(message.toLowerCase())) {
    var streamerName = channel.toString().toLowerCase().substring(1);
    updateNetworthMap(streamerName, 0.01);
    insertCorpa(streamerName);
  }

  // Sub Corpa Value
  if (sellKeywords.includes(message.toLowerCase())) {
    var streamerName = channel.toString().toLowerCase().substring(1);
    updateNetworthMap(streamerName, -0.01);
    insertCorpa(streamerName);
  }

  //Check Streamer Value
  if (message.toLowerCase().includes("!corpastock")) {
    var clientName = new MongoClient(
      process.env.MONGO_URL.concat(channel.toString().substring(1))
    );
    var channelName = channel.toString().substring(1);
    getCorpa(channelName).then((corpaCost) => {
      twitchClient.say(
        channel,
        `@${tags.username} $${channelName.toUpperCase()} is worth ${corpaCost
          .toFixed(2)
          .concat(" Corpas")}`
      );
    });
  }
});

function updateNetworthMap(channel, amount) {
  netWorthMap.set(channel, netWorthMap.get(channel) + amount); //TODO
}

module.exports = async function () {
  await setNetworth("italiandogs");
  await setNetworth("mizkif");
  // console.log(netWorthMap.get("italiandogs"));

  // //____________________________________________________________
  // //initial IPO of streamer (keep commented out unless needed)
  // //Networth formula: in env file

  // var stremerToAdd = "test";
  // var ipoAmount = 69420;

  // netWorthMap.set(stremerToAdd, ipoAmount);
  // await initialIPO(
  //   new MongoClient(process.env.MONGO_URL.concat(stremerToAdd)),
  //   stremerToAdd,
  //   {
  //     channelId: stremerToAdd,
  //     stockName: "$".concat(stremerToAdd),
  //     stockPrice: ipoAmount,
  //     //timestamp: new Date().toISOString(),
  //     timestamp: Math.round(Date.now() / 1000),
  //   }
  // );
  // //___________________________________________________________
};
