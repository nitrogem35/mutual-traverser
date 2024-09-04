require('dotenv').config();
const { createInterface } = require('node:readline/promises');
const fs = require('node:fs');
const { Client } = require('discord.js-selfbot-v13');
const chalk = require('chalk');
const Discord = require('./discord.js');
const client = new Client({
    http: {
        headers: { "x-super-properties": "eyJvcyI6Ik1hYyBPUyBYIiwiYnJvd3NlciI6IkNocm9tZSIsImRldmljZSI6IiIsInN5c3RlbV9sb2NhbGUiOiJlbi1VUyIsImJyb3dzZXJfdXNlcl9hZ2VudCI6Ik1vemlsbGEvNS4wIChNYWNpbnRvc2g7IEludGVsIE1hYyBPUyBYIDEwXzE1XzcpIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS8xMjguMC4wLjAgU2FmYXJpLzUzNy4zNiIsImJyb3dzZXJfdmVyc2lvbiI6IjEyOC4wLjAuMCIsIm9zX3ZlcnNpb24iOiIxMC4xNS43IiwicmVmZXJyZXIiOiIiLCJyZWZlcnJpbmdfZG9tYWluIjoiIiwicmVmZXJyZXJfY3VycmVudCI6IiIsInJlZmVycmluZ19kb21haW5fY3VycmVudCI6IiIsInJlbGVhc2VfY2hhbm5lbCI6InN0YWJsZSIsImNsaWVudF9idWlsZF9udW1iZXIiOjMyMzUzOSwiY2xpZW50X2V2ZW50X3NvdXJjZSI6bnVsbH0=" }
    }
});
const version = "2024.09.04";

const token = process.env.token;
if (!token) {
    console.log("Please specify a token in .env to use this script.");
}

const bruteforceInterval = 300;
const charset = [...new Array(36).fill().map((e, i) => {
    return i < 26 ? String.fromCharCode(i + 97) : i - 26;
})];
const speeds = {
    1: Math.round(charset.length * (bruteforceInterval / 1000)),
    4: Math.round((charset.length ** 4) * (bruteforceInterval / 1000))
};

//Receive CLI input
const input = createInterface({
    input: process.stdin,
    output: process.stdout
});

(async () => {
    while (true) {
        let cmd = await input.question("> ");
        switch (cmd) {
            case "help": {
                console.log(chalk.bold([
                    "exit - exit the program",
                    "help - show this list",
                    "scrape - extract member list for later analysis",
                    "mutuals - find people who share a specific server in common using a 'scrape'-generated list",
                    "",
                    "mutual-traverser v" + version
                ].join("\n")));
                break;
            }
            case "scrape": {
                let serverToTraverse = await input.question(chalk.bold("Where are you searching for mutuals? (paste server ID):\n"));
                let guild;
                try { 
                    guild = await client.guilds.fetch(serverToTraverse);
                } catch (e) {}
                while (!guild) {
                    serverToTraverse = await input.question(chalk.yellow.bold("That server ID isn't in your server list. Try again:\n"));
                    guild = await client.guilds.fetch(serverToTraverse);
                }

                let depth;
                while (isNaN(depth) || !(depth >= 1 && depth <= 4)) {
                    depth = parseInt(await input.question(chalk.bold(`Enter a depth (1-4) for bruteforcing the member list (1 = ~${speeds[1]}s, 4 = ~${speeds[4]}s):\n`)));
                }

                console.log(chalk.green.bold(("Bruteforcing member list...")));
                let startTs = Date.now();
                let membersFound = new Map();
                let iter = 0;
                while (iter < charset.length ** depth) {
                        let query = "";
                        let rem = iter;
                        for (let i = depth; i > 0; i--) {
                            if (rem + 1 >= charset.length ** (i - 1)) {
                                let subtractable = Math.floor(rem / charset.length ** (i - 1));
                                query += charset[subtractable];
                                rem -= subtractable * (charset.length ** (i - 1));
                            }
                        }
                        console.log(`Searching with query: "${query}" (${membersFound.size < 1000 ? membersFound.size : (membersFound.size / 1000).toFixed(1) + 'k'} found)`)
                        let memberList = await guild.members.fetch({ query, limit: 100 });
                        for (let [id, memberObj] of memberList) {
                            if (!membersFound.has(id)) {
                                membersFound.set(id, memberObj);
                                console.log(chalk.green.bold(`Found "${memberObj.user.username}" with ID ${id}`));
                            }
                        }
                        await sleep(bruteforceInterval);
                    iter++;
                }
                console.log(chalk.green.bold(`Run summary: ${membersFound.size} unique users found, ${Math.floor((Date.now() - startTs) / 1000).toLocaleString()} seconds elapsed`));
                let toStore = JSON.stringify([...membersFound]);
                if (!fs.existsSync('scraped')) fs.mkdirSync('scraped');
                let filename = `scraped/${serverToTraverse}.json`;
                fs.writeFileSync(filename, toStore);
                console.log(chalk.green.bold("Saved run to " + filename));
                break;
            }
            case "exit": {
                process.exit(0);
                break;
            }
            default: {
                console.log(chalk.red.bold("That command doesn't exist. Run 'help' to see commands."));
                break;
            }
        }
    }
})();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

//Initialize the selfbot to grab member info later
Discord.login(token);
client.login(token);