const { Client, GatewayIntentBits, Partials, Collection, MessageFlags, Events } = require("discord.js");
const { commands } = require("./commands");
const { getActiveChannel } = require("../tts/join-leave");
const { sanitizeMessage, pickName } = require("../tts/text-processing");
const { addToMessageQueue } = require("../tts/voice-models");
const { processKick, join, leave, autoLeave } = require("../tts/voice-events");
const { getVoiceConnection } = require("@discordjs/voice");

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

    client.on(Events.MessageCreate, async (message) => {
        if (message.channel.id != getActiveChannel())
            return;

        let text = message.content.trim();
        if (!text) return;

        text = sanitizeMessage(text);

        if (lastUser != message.author.id) {
            text = `${pickName(message.author.username, message.author.displayName)} a écrit: ${text}`;
            lastUser = message.author.id;
        }

        addToMessageQueue(text);
    });

    client.commands = new Collection();
    for (const command of commands) {
        client.commands.set(command.data.name, command);
    }

    client.on(Events.InteractionCreate, async (interaction) => {
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

    client.on(Events.VoiceStateUpdate, (oldState, newState) => {
        const connection = getVoiceConnection(newState.guild.id);
        if (!connection)
            return;

        const botChannelId = connection.joinConfig.channelId;
        if (!botChannelId)
            return;

        if (oldState.member.id === client.user.id && !newState.channelId) {
            processKick();
            return;
        }

        if ((newState.member.id === client.user.id || oldState.member.id === client.user.id) ||
            (oldState.channelId !== botChannelId && newState.channelId !== botChannelId))
            return;

        const member = newState.member;

        if (oldState.channelId !== botChannelId && newState.channelId === botChannelId) {
            join(member);
        }

        if (oldState.channelId === botChannelId && newState.channelId != botChannelId) {
            leave(member);

            const channel = client.channels.cache.get(botChannelId);
            if (channel) {
                const people = channel.members.filter(m => !m.user.bot);
                if (people.size === 0) {
                    autoLeave();
                }
            }
        }
    });

    client.once(Events.ClientReady, () => {
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