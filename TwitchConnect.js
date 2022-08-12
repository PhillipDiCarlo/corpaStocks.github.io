console.log("Twitch Bot Starting");

//Requirements
//require("tedious");
const tmi = require("tmi.js");
var HashMap = require("hashmap");

//MongoDB connection
var MongoClient = require("mongodb").MongoClient;
var databaseName = "streamerStocks";
var collectionName; // TODO
var netWorthMap = new HashMap();

//Networth formula: in env file

//initial set of streamers worth if collection exists
async function setNetworth(streamer) {
  var clientName = new MongoClient(process.env.MONGO_URL.concat(streamer));
  await getCorpa(clientName, streamer).then((tempIPO) => {
    netWorthMap.set(streamer, tempIPO);
  });

  //console.log(netWorthMap.get("italiandogs"));
}

async function insertCorpa(client, streamerName, newInsert) {
  const result = await client
    .db(databaseName)
    .collection(streamerName)
    .insertOne(newInsert);
  console.log("document inserted");
}

//get stonk price
async function getCorpa(client, channelName) {
  client.connect();
  const db = client.db(databaseName);
  const collection = db.collection(channelName);
  const cursor = collection.find().sort("timestamp", -1).limit(1);
  const item = await cursor.next();
  const finalItem = item.stockPrice;
  return finalItem;
}
console.log("TWITCH BOT PSWD:", process.env.TWITCH_OAUTH_TOKEN);

const twitchClient = new tmi.Client({
  options: { debug: true },
  identity: {
    username: process.env.TWITCH_BOT_USERNAME,
    password: process.env.TWITCH_OAUTH_TOKEN,
  },
  // Channels to watch
  channels: ["Italiandogs"],
});

twitchClient.connect();

twitchClient.on("message", (channel, tags, message, self) => {
  // Ignore echoed messages.
  if (self) return;

  //Sell Stonks
  if (
    message.toLowerCase() === "corpa sell" ||
    message.toLowerCase() === "sell corpa"
  ) {
    var streamerName = channel.toString().toLowerCase().substring(1);
    netWorthMap.set(
      channel.toString().substring(1),
      netWorthMap.get(channel.toString().substring(1)) - 0.01
    );
    insertCorpa(
      new MongoClient(
        process.env.MONGO_URL.concat(channel.toString().substring(1))
      ),
      streamerName,
      {
        channelId: channel,
        stockName: "$".concat(channel.toString().substring(1)),
        stockPrice: netWorthMap.get(channel.toString().substring(1)),
        //timestamp: new Date().toISOString(),
        timestamp: Math.round(Date.now() / 1000),
      }
    );
  }

  //Buy Stonks
  if (
    message.toLowerCase() === "corpa buy" ||
    message.toLowerCase() === "buy corpa"
  ) {
    var streamerName = channel.toString().toLowerCase().substring(1);
    netWorthMap.set(
      channel.toString().substring(1),
      netWorthMap.get(channel.toString().substring(1)) + 0.01
    );
    insertCorpa(
      new MongoClient(
        process.env.MONGO_URL.concat(channel.toString().substring(1))
      ),
      streamerName,
      {
        channelId: channel,
        stockName: "$".concat(channel.toString().substring(1)),
        stockPrice: netWorthMap.get(channel.toString().substring(1)),
        //timestamp: new Date().toISOString(),
        timestamp: Math.round(Date.now() / 1000),
      }
    );
  }

  //Check Streamer Value
  if (message.toLowerCase() === "!corpastonk") {
    var clientName = new MongoClient(
      process.env.MONGO_URL.concat(channel.toString().substring(1))
    );
    var channelName = channel.toString().substring(1);
    getCorpa(clientName, channelName).then((corpaCost) => {
      twitchClient.say(
        channel,
        `@${tags.username} $${channel
          .toString()
          .substring(1)
          .toUpperCase()} is worth ${corpaCost.toFixed(2)}`
      );
    });
  }
});

module.exports = async function () {
  //netWorthMap.set("<channelName>", <ipoNumber>);
  await setNetworth("italiandogs");
  console.log(netWorthMap.get("italiandogs"));
};
