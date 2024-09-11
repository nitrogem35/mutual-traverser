require('dotenv').config();
const { createInterface } = require('node:readline/promises');
const fs = require('node:fs');
const { Client } = require('discord.js-selfbot-v13');
const { select } = require('@inquirer/prompts');
const chalk = require('chalk');
const Discord = require('./discord.js');
const client = new Client({
    http: {
        headers: { "x-super-properties": "eyJvcyI6Ik1hYyBPUyBYIiwiYnJvd3NlciI6IkNocm9tZSIsImRldmljZSI6IiIsInN5c3RlbV9sb2NhbGUiOiJlbi1VUyIsImJyb3dzZXJfdXNlcl9hZ2VudCI6Ik1vemlsbGEvNS4wIChNYWNpbnRvc2g7IEludGVsIE1hYyBPUyBYIDEwXzE1XzcpIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS8xMjguMC4wLjAgU2FmYXJpLzUzNy4zNiIsImJyb3dzZXJfdmVyc2lvbiI6IjEyOC4wLjAuMCIsIm9zX3ZlcnNpb24iOiIxMC4xNS43IiwicmVmZXJyZXIiOiIiLCJyZWZlcnJpbmdfZG9tYWluIjoiIiwicmVmZXJyZXJfY3VycmVudCI6IiIsInJlZmVycmluZ19kb21haW5fY3VycmVudCI6IiIsInJlbGVhc2VfY2hhbm5lbCI6InN0YWJsZSIsImNsaWVudF9idWlsZF9udW1iZXIiOjMyMzUzOSwiY2xpZW50X2V2ZW50X3NvdXJjZSI6bnVsbH0=" }
    }
});
const version = "2024.09.10";
let clientReady = false;

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
async function getInput(prompt) {
    let input = createInterface({
        input: process.stdin,
        output: process.stdout
    });
    let response = await input.question(prompt);
    input.close();
    return response;
}

async function appLoop() {
    while (clientReady) {
        let cmd = await getInput("> ");
        switch (cmd) {
            case "help": {
                console.log(chalk.bold([
                    "exit - exit the program",
                    "help - show this list",
                    "scrape - extract member list for later analysis",
                    "mutuals - find people who share a specific server in common",
                    "",
                    "mutual-traverser v" + version
                ].join("\n")));
                break;
            }
            case "scrape": {
                let serverToTraverse = await getInput(chalk.bold("Where are you searching for mutuals? (paste server ID):\n"));
                let guild;
                try { 
                    guild = await client.guilds.fetch(serverToTraverse);
                } catch (e) {}
                while (!guild) {
                    serverToTraverse = await getInput(chalk.yellow.bold("That server ID isn't in your server list. Try again:\n"));
                    guild = await client.guilds.fetch(serverToTraverse);
                }

                let depth;
                while (isNaN(depth) || !(depth >= 1 && depth <= 4)) {
                    depth = parseInt(await getInput(chalk.bold(`Enter a depth (1-4) for bruteforcing the member list (1 = ~${speeds[1]}s, 4 = ~${speeds[4]}s):\n`)));
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
                        let memberList;
                        try { 
                            memberList = await guild.members.fetch({ query, limit: 100 });
                        } catch (e) {
                            console.log(chalk.red.bold("Search error, trying again..."));
                            continue;
                        }
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
            case "mutuals": {
                let scraped = fs.readdirSync('scraped').filter(fn => fn.endsWith(".json"));
                if (scraped.length == 0) {
                    console.log(chalk.hex("#FFA500").bold("No scraped member lists found! Run 'scrape' first."));
                    break;
                }
                let filename = await select({
                    message: 'Choose a member list to find mutuals in',
                    choices: scraped.map(fn => { return { name: fn, value: fn }; })
                })
                let loadedList = JSON.parse(fs.readFileSync('scraped/' + filename));
                console.log(chalk.green.bold("Finished loading precompiled list, processing..."));
                let mutualServers = {};
                let myServers = client.guilds.cache;
                let ct = 0;
                let failuresSuccessive = 0;
                for (let [id, member] of loadedList) {
                    try {
                        let memberDetails = await Discord.userProfile(id);
                        if (memberDetails.retry_after) {
                            await sleep(memberDetails.retry_after + 100);
                            memberDetails = await Discord.userProfile(id);
                        }
                        if (memberDetails.user.bot || memberDetails.user.id == client.user.id) continue;
                        for (let guild of memberDetails.mutual_guilds) {
                            if (guild.id != member.guildId) {
                                let msg = `${memberDetails.user.username} shares ${myServers.get(guild.id)?.name} (${guild.id}) in common with you`;
                                if (!mutualServers[guild.id]) {
                                    mutualServers[guild.id] = [];
                                    msg = chalk.blue.bold(msg + ' (new!)');
                                }
                                mutualServers[guild.id].push(memberDetails);
                                console.log(msg);
                                ct++;
                            }
                        }
                        failuresSuccessive = 0;
                    } catch (e) {
                        console.log(chalk.red.bold("An error occured with processing a member, ratelimit?"));
                        failuresSuccessive++;
                        if (failuresSuccessive == 5) {
                            console.log(chalk.red.bold("Terminating after 5 successive failures"));
                            break;
                        }
                    }
                    await sleep(2000);
                }
                console.log(chalk.green.bold(`Found ${Object.keys(mutualServers).length} mutual servers with ${ct} total occurrences`));
                let parsedMutualServers = "";
                for (let serverId of Object.keys(mutualServers)) {
                    let serverName = myServers.has(serverId) ? myServers.get(serverId).name : "Unknown Server";
                    parsedMutualServers += [
                        `---${serverName} (${serverId})---`,
                        ...mutualServers[serverId].map(memberDetails => `${memberDetails.user.username} (${memberDetails.user.id})`),
                        "", ""
                    ].join('\n');
                }
                if (!fs.existsSync('parsed')) fs.mkdirSync('parsed');
                let parsedFileName = `parsed/${filename.split(".json")[0]}.txt`;
                fs.writeFileSync(parsedFileName, parsedMutualServers);
                console.log(chalk.green.bold("Saved mutual servers to " + parsedFileName));
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
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

client.on('ready', () => {
    clientReady = true;
    console.log(chalk.green.bold("Logged in as " + client.user.username));
    appLoop();
});

//Initialize the selfbot to grab member info later
Discord.login(token);
client.login(token);
console.log(chalk.yellow.bold("Logging in to Discord..."));