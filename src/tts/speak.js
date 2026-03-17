const { spawn } = require("child_process");
const { player } = require("./player");
const { createAudioResource, StreamType } = require("@discordjs/voice");

const audioChunkQueue = [];
let processingChunk = false;

async function convertAndPlayChunk() {
    if (processingChunk || audioChunkQueue.length === 0) return;
    processingChunk = true;

    const ffmpeg = spawn("ffmpeg", [
        "-hide_banner",
        "-loglevel", "error",
        "-flags", "low_delay",
        "-f", "s16le",
        "-ar", process.env.SAMPLE_RATE,
        "-ac", "1",
        "-i", "pipe:0",
        "-f", "s16le",
        "-ar", "48000",
        "-ac", "2",
        "pipe:1"
    ]);

    ffmpeg.on("error", (err) => console.error("ffmpeg spawn error:", err));
    ffmpeg.stderr.on("data", (d) => {
        console.error(d.toString());
    });

    const resource = createAudioResource(ffmpeg.stdout, { inputType: StreamType.Raw });
    player.play(resource);

    let chunk;
    // wait 200ms to gather more chunks
    await new Promise(res => setTimeout(res, 200));
    while (chunk = audioChunkQueue.shift()) {
        ffmpeg.stdin.write(chunk);
    }
    ffmpeg.stdin.end();

    ffmpeg.on("close", () => {
        processingChunk = false;
        convertAndPlayChunk();
    });
}

function addAndProcessAudioChunk(chunk) {
    audioChunkQueue.push(chunk);
    convertAndPlayChunk();
}

module.exports = {
    addAndProcessAudioChunk
}