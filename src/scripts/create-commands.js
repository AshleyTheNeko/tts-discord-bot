// deploy-commands.js
const { REST, Routes } = require('discord.js');
const { commands: commandArray } = require('../discord/commands');
require('dotenv').config();

const clientId = process.env.APPID;
// const guildId = process.env.GUILD; // For debug, one guild only
const token = process.env.TOKEN;

const commands = commandArray.map(command => {
    if (!command.data || typeof command.data.toJSON !== 'function') {
        console.warn(`Skipping invalid command ${command?.data?.name || 'unnamed'}`);
        return null;
    }
    return command.data.toJSON();
}).filter(Boolean);

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} guild commands.`);

        const data = await rest.put(
            // Routes.applicationGuildCommands(clientId, guildId), // guild only
            Routes.applicationCommands(clientId),
            { body: commands }
        );

        console.log(`Successfully reloaded ${data.length} guild commands!`);
    } catch (error) {
        console.error('Error:', error);
    }
})();