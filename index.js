require('dotenv').config({ path: ['.env', ...process.env.NODE_ENV ? [`.env.${process.env.NODE_ENV}`] : []] })
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require("@discordjs/voice");
const { spawn } = require("child_process");

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;
const TEXT_CHANNEL_ID = process.env.TEXT_CHANNEL_ID;
const PIPER_PATH = process.env.PIPER_PATH;
const MODEL_PATH = process.env.MODEL_PATH;
const SAMPLE_RATE = process.env.SAMPLE_RATE; // e.g. "16000"

let connected = false
let voiceConnection;
let guild;
let voiceChannel;
let lastUser;

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

function joinVoice() {
  voiceConnection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
  });
  connected = true;

  voiceConnection.subscribe(player);
  console.log("\x1b[32mIn voice channel\x1b[0m");
  messageQueue.unshift("piepo dit: ohailloh la team, piepo-déssou");
  processMessage();
}

function leaveVoice() {
  voiceConnection.destroy();
  voiceConnection = null;
  connected = false;
  console.log("\x1b[32mLeft voice channel\x1b[0m");
}

client.once("clientReady", async () => {
  console.log(`\x1b[32mLogged in as ${client.user.tag}\x1b[0m`);

  guild = await client.guilds.fetch(GUILD_ID);
  voiceChannel = await guild.channels.fetch(VOICE_CHANNEL_ID);
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

function pickName(username, displayName) {
  if (!displayName) return username;

  const names = [displayName, username];

  const digitCounts = names.map(name => (name.match(/\d/g) || []).length);
  const minIndex = digitCounts[0] > digitCounts[1] ? 1 : 0;

  return names[minIndex];
}

client.on("messageCreate", async (message) => {
  if (message.channel.id !== TEXT_CHANNEL_ID) return;
  if (message.content == "/piepo dégage" && connected) {
    leaveVoice();
    return;
  }
  if (message.content == "/piepo au pied" && !connected) {
    joinVoice();
    return;
  }
  if (!connected) return;

  const text = message.content.trim();
  if (!text) return;

  let segment = text
    .replace(/<a?:([^:\s>]+):\d+>/g, "emoji $1") // emoji processing
    .replace(
      /https?:\/\/tenor\.com\/view\/([a-zA-Z-]+)-gif-\d+/g,
      (_, slug) => slug.replace(/-/g, " ")
    ) // tenor gifs keyword extraction
    .replace(
      /\bhttps?:\/\/([^\s\/]+)(?:\/\S+)?(?:\.(gif|png|jpe?g|webp|mp4|mov|html))?(\?\S*)?\b/gi,
      (_, domain, ext) => `lien vers ${domain}${ext ? ` fichier ${ext.toLowerCase()}` : ""}`
    ) // other files and links
    .replace(/\s+/g, " ")
    .trim();
  
  segment = `${segment} piepo`
  if (lastUser != message.author.id) {
    segment = `${pickName(message.author.username, message.member.displayName)} a écrit: ${segment}`;
    lastUser = message.author.id;
  }

  messageQueue.push(segment);

  processMessage();
});

client.login(TOKEN);