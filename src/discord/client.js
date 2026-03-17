const { Client, GatewayIntentBits, Partials, Collection, MessageFlags } = require("discord.js");
const { commands } = require("./commands");
const { getActiveChannel } = require("../tts/join-leave");
const { sanitizeMessage, pickName } = require("../tts/text-processing");
const { addToMessageQueue } = require("../tts/voice-models");

let clientInstance = null;
let lastUser = 0;

function getClient() {
    if (clientInstance) return clientInstance;

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ],
        partials: [Partials.Channel],
    });

    client.on("messageCreate", async (message) => {
        if (message.channel.id != getActiveChannel())
            return;

        let text = message.content.trim();
        if (!text) return;

        text = sanitizeMessage(text);

        if (lastUser != message.author.id) {
            text = `${pickName(message.author.username, message.member.displayName)} a écrit: ${text}`;
            lastUser = message.author.id;
        }

        addToMessageQueue(text);
    });

    client.commands = new Collection();
    for (const command of commands) {
        client.commands.set(command.data.name, command);
    }

    client.on("interactionCreate", async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "internal piepo error", flags: MessageFlags.Ephemeral
                }).catch(() => { });
            }
        }
    });

    client.once("clientReady", () => {
        console.log(`\x1b[32mLogged in as ${client.user.tag}\x1b[0m`);
    });

    client.login(process.env.TOKEN).catch((err) => {
        console.error("Failed to login:", err);
        clientInstance = null;
    });

    clientInstance = client;
    return client;
}

module.exports = { getClient };