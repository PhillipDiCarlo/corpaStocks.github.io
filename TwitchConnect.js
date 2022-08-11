console.log("Twitch Bot Starting");

//Requirements
require("dotenv").config();
//require("tedious");
const tmi = require('tmi.js');
var HashMap = require("hashmap");

//MongoDB connection
var MongoClient = require('mongodb').MongoClient;
var databaseName = "test";
var collectionName = "streamers";

var italiandogsWorth = 45;
var mzikifWorth = 0;
var netWorthMap = new HashMap();

//Networth formula: in env file
netWorthMap.set("mizkif", 231731);
netWorthMap.set("italiandogs", 22);


async function insertCorpa(client, newInsert) {
	const result = await client.db(databaseName).collection(collectionName).insertOne(newInsert);
	//console.log("document inserted")
}


const twitchClient = new tmi.Client({
	options: { debug: true },
	identity: {
		username: process.env.TWITCH_BOT_USERNAME,
		password: process.env.TWITCH_OAUTH_TOKEN
	},
	channels: [ 'Italiandogs']
});


twitchClient.connect();

twitchClient.on('message', (channel, tags, message, self) => {
	// Ignore echoed messages.
	if(self) return;

    //Sell Stonks
	if(message.toLowerCase() === 'corpa sell' ||
	   message.toLowerCase() === 'sell corpa') {
		netWorthMap.set(channel.toString().substring(1), netWorthMap.get(channel.toString().substring(1))-0.01);
		insertCorpa(new MongoClient(process.env.MONGO_URL.concat(channel.toString().substring(1))), {
			channelId: channel,
			stockName: "$".concat(channel.toString().substring(1)),
			stockPrice: netWorthMap.get(channel.toString().substring(1)),
			timestamp: new Date().toISOString()
		})
	 }

    //Buy Stonks
    if(message.toLowerCase() === "corpa buy" ||
	   message.toLowerCase() === 'buy corpa') {
		netWorthMap.set(channel.toString().substring(1), netWorthMap.get(channel.toString().substring(1))+0.01);
		console.log (netWorthMap.get("italiandogs"));
		insertCorpa(new MongoClient(process.env.MONGO_URL.concat(channel.toString().substring(1))), {
			channelId: channel,
			stockName: "$".concat(channel.toString().substring(1)),
			stockPrice: netWorthMap.get(channel.toString().substring(1)),
			timestamp: new Date().toISOString()
		})
	 }

	 //Check Streamer Value
	 if(message.toLowerCase() === "!corpastonk") {
		twitchClient.say(channel, `@${tags.username} $${channel.toString().substring(1).toUpperCase()} is worth bubcus`);


	 }

	 //debugger
	 if(message === "!dbg"){
		console.log(new MongoClient(process.env.MONGO_URL.concat(channel.toString().substring(1))).db(databaseName).collection(collectionName).find().sort({_id:-1}).limit(1));
	 }

});