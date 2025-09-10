const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require("@discordjs/voice");
const { spawn } = require("child_process");

const TOKEN = "BOT TOKEN HERE";
const GUILD_ID = "GUILD ID HERE";
const VOICE_CHANNEL_ID = "VOICE CHANNEL ID HERE";
const TEXT_CHANNEL_ID = "TEXT CHANNEL ID HERE";
const PIPER_PATH = "PIPER PATH HERE";
const MODEL_PATH = "MODEL PATH HERE";
const SAMPLE_RATE = "SAMPLE RATE HERE"; // e.g., "16000"

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const messageQueue = [];
let processingMessage = false;
const chunkQueue = [];
let processingChunk = false;

const piper = spawn(PIPER_PATH, [
  "--model", MODEL_PATH,
  "--output-raw",
]);
piper.on("exit", (code, signal) => {
  console.error(`\x1b[31mPiper exit ${code} ${signal || ""}\x1b[0m`);
});

let player = createAudioPlayer();

async function processChunk() {
  if (processingChunk || chunkQueue.length === 0) return;
  processingChunk = true;

  const ffmpeg = spawn("ffmpeg", [
    "-hide_banner",
    "-loglevel", "error",
    "-flags", "low_delay",
    "-f", "s16le",
    "-ar", SAMPLE_RATE,
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
  // wait 200ms a second to gather more chunks
  await new Promise(res => setTimeout(res, 200));
  while (chunk = chunkQueue.shift()) {
    ffmpeg.stdin.write(chunk);
  }
  ffmpeg.stdin.end();

  ffmpeg.on("close", () => {
    processingChunk = false;
    processChunk();
  });
}

piper.stdout.on("data", async (chunk) => {
  chunkQueue.push(chunk);
  processChunk();
});

let connection;
client.once("clientReady", async () => {
  console.log(`\x1b[32mLogged in as ${client.user.tag}\x1b[0m`);

  const guild = await client.guilds.fetch(GUILD_ID);
  const voiceChannel = await guild.channels.fetch(VOICE_CHANNEL_ID);

  connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
  });

  connection.subscribe(player);
  console.log("\x1b[32mIn voice channel\x1b[0m");
});

async function processMessage() {
  if (processingMessage || messageQueue.length === 0) return;
  processingMessage = true;

  const text = messageQueue.shift();
  if (!text) {
    processingMessage = false;
    return;
  }

  console.log("\x1b[36mReading line:\x1b[0m", text);

  try {
    piper.stdin.write(text + "\n");

    player.once(AudioPlayerStatus.Playing, () => {
      console.log("\x1b[33mStarted speaking...\x1b[0m");
    });

    player.once(AudioPlayerStatus.Idle, () => {
      console.log("\x1b[32mFinished speaking.\x1b[0m");
      processingMessage = false;
      processMessage();
    });
  } catch (err) {
    console.error("\x1b[31mError processing TTS:\x1b[0m", err);
    processingMessage = false;
    processMessage();
  }
}

client.on("messageCreate", async (message) => {
  if (message.channel.id !== TEXT_CHANNEL_ID) return;

  const text = message.content.trim();
  if (!text) return;

  const segments = text
    .split(/\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  segments.forEach(segment => {
    messageQueue.push(segment);
  });

  processMessage();
});

client.login(TOKEN);