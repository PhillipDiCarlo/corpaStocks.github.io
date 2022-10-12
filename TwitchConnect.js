console.info("Twitch Bot Starting");

//Requirements
const tmi = require("tmi.js");
let HashMap = require("hashmap");
const { networkInterfaces } = require("os");
const request = require("request");
const cheerio = require("cheerio");

const buyKeywords = ["corpa buy", "buy corpa"];
const sellKeywords = ["corpa sell", "sell corpa"];
let numberOfStreamers;

let channels2Watch = new HashMap();

//MongoDB connection
let MongoClient = require("mongodb").MongoClient;
let databaseName = "streamerStocks";
let netWorthMap = new HashMap();

//initial set of streamers worth if collection exists
async function setNetworth() {
  for (let x = 0; x < numberOfStreamers; x++) {
    let streamer = channels2Watch.get(x);
    await getCorpa(streamer).then((tempIPO) => {
      netWorthMap.set(streamer, tempIPO);
    });
  }
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
async function addNewStreamer(channel, followerCount) {
  if (streamerExists(channel)) {
    twitchClient.say(
      "#corpaStocks",
      `@${channel}! You already exist in the matrix`
    );
    return;
  }
  // Adds streamer to 'streamerList'
  await addStreamerList(channel);
  // Determines IPO value via followers
  let ipoValue = await determinIPOValue(followerCount);
  // Creates new collection for streamer
  await createCollection(channel);
  await initialIPO(channel, ipoValue);
  // Joins twitch chat
  twitchClient.join(channel);
  twitchClient.say("#corpaStocks", `@${channel}! Congrats! You've been added`);
}

async function initialIPO(channel, ipoValue) {
  const mongo = new MongoClient(process.env.MONGO_URL.concat(channel));
  const result = await mongo
    .db(databaseName)
    .collection(channel)
    .insertOne({
      channelId: "#".concat(channel),
      stockName: "$".concat(channel),
      stockPrice: ipoValue,
      //timestamp: new Date().toISOString(),
      timestamp: Math.round(Date.now() / 1000),
    });
}
//Create a new collection in the document
async function createCollection(channel) {
  const mongo = new MongoClient(process.env.MONGO_URL.concat("streamerList"));
  const result = await mongo.db(databaseName).createCollection(channel);
}

async function determinIPOValue(followerCount) {
  return Math.pow(Math.sqrt(followerCount) / 3, 2) + 3;
}

// Adds user to streamerList DB
async function addStreamerList(channel) {
  numberOfStreamers++;

  const mongo = new MongoClient(process.env.MONGO_URL.concat("streamerList"));
  const result = await mongo
    .db(databaseName)
    .collection("streamerList")
    .insertOne({
      EntryNumber: numberOfStreamers,
      streamerName: channel,
    });

  //Adds streamer to hashMap
  channels2Watch.set(numberOfStreamers - 1, channel);
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
  channels: ["corpastocks"],
});

twitchClient.connect();
async function twitchChat() {
  twitchClient.on("message", (channel, tags, message, self) => {
    // Ignore echoed messages.
    if (self) return;

    // Add Corpa Value
    if (
      message.toLowerCase().includes(buyKeywords[0]) ||
      message.toLowerCase().includes(buyKeywords[1])
    ) {
      let streamerName = channel.toString().toLowerCase().substring(1);
      updateNetworthMap(streamerName, 0.01);
      insertCorpa(streamerName);
    }

    // Sub Corpa Value
    if (
      message.toLowerCase().includes(sellKeywords[0]) ||
      message.toLowerCase().includes(sellKeywords[1])
    ) {
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

    // Listen for new user wanting to be added
    if (
      channel.toString().substring(1) === "corpastocks" &&
      message.toLowerCase() === "!addme"
    ) {
      let followers = getFollowerAmount(tags["user-id"], tags.username);
      if (followers < 50) {
        twitchClient.say(
          channel,
          `@${tags.username} You must have at least 50 followers or are too new to be added. Come back later!`
        );
      } else {
        addNewStreamer(tags.username, followers);
      }
    }
  });
}

// Check if streamer has already been added
async function streamerExists(channel) {
  for (let x = 0; x < numberOfStreamers; x++) {
    if (channels2Watch.get(x) === channel.toLowerCase()) return true;
  }
  return false;
}
// update hashmap and join commands here
async function getFollowerAmount(twitchID, twitchUsername) {
  let followerCount = 0;
  let endURL = twitchID.concat("-").concat(twitchUsername);

  await request(
    "https://www.twitchmetrics.net/c/".concat(endURL),
    (error, response, html) => {
      let htmlResponses = [];
      if (!error && response.statusCode == 200) {
        const $ = cheerio.load(html);
        $(".col-6").each((index, element) => {
          let columnArray = $(element).first().text();
          htmlResponses[index] = columnArray;
        });
        followerCount = parseInt(htmlResponses[11]);
      } else {
        console.log("HTML Error Code: ".concat(response.statusCode));
        followerCount = 0;
      }
    }
  );

  return followerCount;
}
// Locally update networth map
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
  await getClientAmount();
  await initializeHashMap();
  await setNetworth();
  await joinChannels();
  twitchChat();
};
