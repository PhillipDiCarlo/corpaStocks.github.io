console.info("Twitch Bot Starting");

//Requirements
const tmi = require("tmi.js");
let HashMap = require("hashmap");
const { networkInterfaces } = require("os");

const buyKeywords = ["corpa buy", "buy corpa"];
const sellKeywords = ["corpa sell", "sell corpa"];
let numberOfStreamers;

let channels2Watch = new HashMap();

//MongoDB connection
let MongoClient = require("mongodb").MongoClient;
let databaseName = "streamerStocks";
let netWorthMap = new HashMap();

//initial set of streamers worth if collection exists
async function setNetworth(streamer) {
  await getCorpa(streamer).then((tempIPO) => {
    netWorthMap.set(streamer, tempIPO);
  });
}

// Add entry into corresponding database collection
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

// New Streamer? Adds to databases
async function addNewStreamer() {
  // TODO - Add streamer to 'streamerList'
  // TODO - Create new collection for streamer
  // TODO = Determine IPO value via followers
  // TODO - Join twitch chat
}

//get stonk price
async function getCorpa(channelName) {
  let client = new MongoClient(process.env.MONGO_URL.concat(channelName));
  client.connect();
  const db = client.db(databaseName);
  const collection = db.collection(channelName);
  const cursor = collection.find().sort("timestamp", -1).limit(1);
  const item = await cursor.next();
  const finalItem = item.stockPrice;
  return finalItem;
}

const twitchClient = new tmi.Client({
  options: { debug: true, joinInterval: 300 },
  identity: {
    username: process.env.TWITCH_BOT_USERNAME,
    password: process.env.TWITCH_OAUTH_TOKEN,
  },
  // Channels to watch
  channels: [],
});

twitchClient.connect();

twitchClient.on("message", (channel, tags, message, self) => {
  // Ignore echoed messages.
  if (self) return;

  // Add Corpa Value
  if (buyKeywords.includes(message.toLowerCase())) {
    let streamerName = channel.toString().toLowerCase().substring(1);
    updateNetworthMap(streamerName, 0.01);
    insertCorpa(streamerName);
  }

  // Sub Corpa Value
  if (sellKeywords.includes(message.toLowerCase())) {
    let streamerName = channel.toString().toLowerCase().substring(1);
    updateNetworthMap(streamerName, -0.01);
    insertCorpa(streamerName);
  }

  //Check Streamer Value
  if (message.toLowerCase().includes("!corpastock")) {
    let clientName = new MongoClient(
      process.env.MONGO_URL.concat(channel.toString().substring(1))
    );
    let channelName = channel.toString().substring(1);
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
  netWorthMap.set(channel, netWorthMap.get(channel) + amount);
}
async function joinChannels() {
  for (let x = 0; x < channels2Watch.size; x++) {
    twitchClient.join(channels2Watch.get(x));
  }
  console.info("Joined all streamer's Chats");
}

async function getClientAmount() {
  let client = new MongoClient(process.env.MONGO_URL.concat("streamerList"));
  client.connect();

  const db = client.db(databaseName);
  const collection = db.collection("streamerList");
  const cursor = collection.find().sort("EntryNumber", -1).limit(1);
  const item = await cursor.next();
  numberOfStreamers = item.EntryNumber;
}

async function initializeHashMap() {
  let client = new MongoClient(process.env.MONGO_URL.concat("streamerList"));
  client.connect();
  const db = client.db(databaseName);
  const collection = db.collection("streamerList");
  const cursor = collection.find().sort("EntryNumber");

  for (let x = 0; x < numberOfStreamers; x++) {
    let item = await cursor.next();
    if (item.isActive === false) {
      // TODO - Add isActive to document
      continue;
    }
    channels2Watch.set(x, item.streamerName);
  }
  console.info("Streamer HashMap Initialized");
}

module.exports = async function () {
  await setNetworth("italiandogs");
  await setNetworth("mizkif");
  await getClientAmount();
  await initializeHashMap();
  await joinChannels();

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
