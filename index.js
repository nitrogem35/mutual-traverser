require('dotenv').config();
const { createInterface } = require('node:readline/promises');
const Discord = require('./discord.js');

const token = process.env.token;
if (!token) {
    console.log("Please specify a token in .env to use this script.");
} else {
    Discord.login(token);
}

const input = createInterface({
    input: process.stdin,
    output: process.stdout
});

(async () => {
    let serverToTraverse = await input.question("Where are you searching for mutuals? (paste server ID)\n");
    
})();