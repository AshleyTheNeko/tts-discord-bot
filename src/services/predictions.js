const fs = require('fs');
const path = require('path');
const { getClient } = require('../discord/client');
const predictionsFile = path.join(__dirname, '..', '..', 'data', 'predictions.json');

let predictions = [];

function startPredictionService() {
    setInterval(async () => {
        if (fs.existsSync(predictionsFile)) {
            try {
                predictions = JSON.parse(fs.readFileSync(predictionsFile, 'utf-8'));
            } catch (error) {
                console.error(err);
            }
        } else {
            return;
        }

        const now = Date.now();
        const due = predictions.filter(p => p.revealAt <= now);

        for (const prediction of due) {
            try {
                const guild = getClient().guilds.cache.get(prediction.guildId);
                if (!guild) continue;

                const channel = guild.channels.cache.get(prediction.channelId);
                if (!channel) continue;

                await channel.send(
                    `Prédiction faite par <@${prediction.authorId}> le ` + `<t:${Math.floor(prediction.predictDate / 1000)}:F>:\n` +
                    `"${Buffer.from(prediction.text, "base64").toString("utf8")}"`
                );

                predictions = predictions.filter(p => p.id !== prediction.id);
                fs.writeFileSync(predictionsFile, JSON.stringify(predictions, null, 2));
            } catch (err) {
                console.error('Failed to reveal prediction:', err);
            }
        }
    }, 60 * 1000); // every mn
}

module.exports = { startPredictionService };