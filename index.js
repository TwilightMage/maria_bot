import { Client, Intents } from 'discord.js'

const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});

client.once('ready', () => {
    console.log('Ready!');
});

client.on('interactionCreate', interaction => {
    // ...
});

client.login('972674518449545227');

/*import express from 'express'

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }))

app.post('/кусь', async function (req, res) {

})

app.listen(PORT, () => {
    console.log('Listening on port', PORT);

    // Check if guild commands from commands.json are installed (if not, install them)
    HasGuildCommands(process.env.APP_ID, process.env.GUILD_ID, [
        TEST_COMMAND,
        CHALLENGE_COMMAND,
    ]);
});
*/