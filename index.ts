import App from './app'

const app = new App()
app.run()

/*import { Client, Intents } from 'discord.js'
import sqlite3 from 'sqlite3'

import config from './config.json' assert { type: "json" }

const db = new sqlite3.Database(config.database)

const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});

client.once('ready', () => {
    console.log('Ready!');
});

client.login(config.token);*/

/*import express from 'express'
import { verifyKey } from 'discord-interactions';

function VerifyDiscordRequest(clientKey) {
    return function (req, res, buf, encoding) {
        const signature = req.get('X-Signature-Ed25519');
        const timestamp = req.get('X-Signature-Timestamp');

        const isValidRequest = verifyKey(buf, signature, timestamp, clientKey);
        if (!isValidRequest) {
            res.status(401).send('Bad request signature');
            throw new Error('Bad request signature');
        }
    };
}

const app = express()

app.use(express.json({ verify: VerifyDiscordRequest(config.public_key) }))

app.listen(config.port, () => {
    console.log('Listening on port', config.port);
});*/
