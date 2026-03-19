const { joinVoiceChannel } = require("@discordjs/voice");
const { addToMessageQueue, clearMessageQueue } = require("./voice-models");
const { player } = require("./player");
const { clearAudioChunks } = require("./speak");

let voiceConnection = 0;
let activeChannel = 0;

function joinVoice(channelId, guild) {
    if (voiceConnection && voiceConnection.state.status !== 'destroyed') {
        return 1;
    }

    voiceConnection = joinVoiceChannel({
        channelId: channelId,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
    });

    activeChannel = channelId;
    voiceConnection.subscribe(player);
    console.log("\x1b[32mIn voice channel\x1b[0m");
    addToMessageQueue("piepo dit: miaou deux points trois");
    return 0;
}

function leaveVoice() {
    if (!voiceConnection || voiceConnection.state.status === 'destroyed') {
        return 1;
    }

    voiceConnection.destroy();
    voiceConnection = null;
    activeChannel = 0;
    clearAudioChunks();
    clearMessageQueue();
    console.log("\x1b[32mLeft voice channel\x1b[0m");
    return 0;
}

function getActiveChannel() {
    return activeChannel;
}

module.exports = { joinVoice, leaveVoice, getActiveChannel };