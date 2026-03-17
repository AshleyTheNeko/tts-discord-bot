const { AudioPlayerStatus } = require("@discordjs/voice");
const { player } = require("./player");
const { addAndProcessAudioChunk } = require("./speak");
const { spawn } = require("child_process");

let piperInstance = null;
const messageQueue = [];
let processingMessage = false

function getPiper() {
    if (piperInstance) return piperInstance;

    const piper = spawn(
        process.env.PIPER_PATH,
        ["--model", process.env.MODEL_PATH, "--output-raw"]
    );

    piper.stdout.on("data", async (chunk) => {
        addAndProcessAudioChunk(chunk);
    });

    piper.on("exit", (code, signal) => {
        console.error(`Piper exited ${code} ${signal || ""}`);
        piperInstance = null;
    });

    piperInstance = piper;
    return piper;
}

async function sendMessageQueueToPiper() {
    if (processingMessage || messageQueue.length === 0) return;
    processingMessage = true;

    const line = messageQueue.shift();
    if (!line) {
        sendMessageQueueToPiper();
        return;
    }

    console.log("\x1b[36mReading line:\x1b[0m", line);

    try {
        getPiper().stdin.write(line + "\n");

        player.once(AudioPlayerStatus.Idle, () => {
            processingMessage = false;
            sendMessageQueueToPiper();
        });
    } catch (err) {
        console.error("\x1b[31mError processing TTS:\x1b[0m", err);
        processingMessage = false;
        sendMessageQueueToPiper();
    }
}

function addToMessageQueue(message) {
    messageQueue.push(message);
    sendMessageQueueToPiper();
}

module.exports = { addToMessageQueue }