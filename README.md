# TTS DISCORD BOT


This is a bot I made because some of my friends often don't have access to their microphone on Discord.

As I'm often too busy playing games to read their texts, this bot reads them out loud for me and anyone else in the voice chat using a text to speech engine.

Yes I'm aware that Discord has a built in tts, but if your Discord language isn't the one your friends speak, you can't just tell the tts to use it. Plus, I'd be the only one in the voice chat hearing the mic-less person, it'd be terribly awkward. Now, everyone gets to speak :3

This software is not very configurable, I made for a very specific purpose. But it can serve as a starter for similar projects. Feel free to reuse this anywhere.

It is currently running on my Raspberry PI 4b.



## Dependencies

* Piper
* Piper voice model
* ffmpeg
* Node >= 22.12


Instructions to install Piper are over there: [Piper1-glp](https://github.com/OHF-Voice/piper1-gpl)

You will need a voice model to provide to Piper. You can find some there: [Piper voices HuggingFace](https://huggingface.co/rhasspy/piper-voices/tree/main)

Personally, I use the french model "Siwis low". It's fast enough to play almost instantly on my PI 4.

You can grab ffmpeg there: [ffmpeg's website](https://www.ffmpeg.org/download.html)



## Installation

Don't forget to run `npm install`

Open `index.js`, and fill in the variables from lines 5 to 11.

To get the guild, voice, and channel id, activate Discord developer mode in Settings > App settings > Advanced > Developer Mode. Then, you will be able to copy ids from the right click menu.

You will need a Discord bot. Head to the developer portal over here to make one: [Discord dev portal](https://discord.com/developers/applications)

You'll have to create an app, grab the token from the `Bot` section and provide it to the token constant.
Don't forget to toggle on `Message Content Intent` in the `Privileged Gateway Intents` part of the Bot section.

To get the `SAMPLE_RATE` value, you will need to fine the rate of your model. Check the `MODEL_CARD` of the one you chose, specifically the `Samplerate` value. Put that value in line 11 without commas.



## Running

`npm run start` or `node index.js`



## TODO

- Use dotenv
- Make ffmpeg a path instead of hardcoding it
- Accept model sample rate argument
- Add a feature to only make the bot join when a command is used



## Side notes

Don't hesitate to open an issue if something's not working well, I'd be glad to help whenever I have some free time.