console.log("Twitch Bot Starting");

require("dotenv").config();
//require("tedious");
const tmi = require('tmi.js');
var mysql = require("mysql");

//mysql connection
var sqlServ = mysql.createConnection({
    host: process.env.SQL_HOST,
	port: process.env.SQL_PORT,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWD,
	insecureAuth: true
})

sqlServ.connect(function(err) {
    if (err) throw err;
    console.log("Connected to SQL Server!");
});


// function wait(ms)
// {
//     var d = new Date();
//     var d2 = null;
//     do { d2 = new Date(); }
//     while(d2-d < ms);
// }

// function randomIntFromInterval(min, max) { // min and max included 
// 	x = Math.floor(Math.random() * (max - min + 1) + min)
// 	return x * 1000

//   }


const client = new tmi.Client({
	options: { debug: true },
	identity: {
		username: process.env.TWITCH_BOT_USERNAME,
		password: process.env.TWITCH_OAUTH_TOKEN
	},
	channels: [ 'Italiandogs']
});


client.connect();

client.on('message', (channel, tags, message, self) => {
	// Ignore echoed messages.
	if(self) return;

    //tell chat gn
	if(message.toLowerCase() === 'corpa sell') {
		client.say(channel, 'corpa HOT SALE!!!!');
	 }

    //i miss ockie
    if(message.toLowerCase() === "corpa buy") {
		client.say(channel, `corpa BUY NOW!!!!`);
	 }

});