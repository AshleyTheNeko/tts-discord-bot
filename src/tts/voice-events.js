const { leaveVoice } = require("./join-leave");
const { addToMessageQueue } = require("./voice-models");

function join(member) {
    console.log(`${member.user.username} joined`);
    setTimeout(() => {
        addToMessageQueue(`Salut ${member.user.displayName}`);
    }, 800);
}

function leave(member) {
    console.log(`${member.user.username} left`);
    addToMessageQueue(`Aurevoir ${member.user.displayName}`);
}

function processKick() {
    console.log("Bot got kicked");
    leaveVoice();
}

function autoLeave() {
    console.log("Voice channel is empty");
    leaveVoice();
}

module.exports = { join, leave, processKick, autoLeave }