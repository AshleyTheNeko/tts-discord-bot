const { SlashCommandBuilder, ChannelType, MessageFlags } = require('discord.js');
const { joinVoice, leaveVoice } = require('../tts/join-leave');
const fs = require('fs');
const path = require('path');

const commands = [{
    data: new SlashCommandBuilder().setName('six').setDescription(':3'),
    async execute(interaction) {

        await interaction.reply(
            `seven`,
        );
    }
},
{
    data: new SlashCommandBuilder()
        .setName('viens')
        .setDescription('Ramène piepo')
        .addChannelOption(option =>
            option
                .setName('salon')
                .setDescription('Salon à rejoindre. Salon texte intégré utilisé pour le tts')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        ),

    async execute(interaction) {
        await interaction.deferReply({});

        const voiceChannel = interaction.options.getChannel('salon');

        if (!voiceChannel || ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(voiceChannel.type)) {
            return interaction.editReply({
                content: 'Salon invalide', flags: MessageFlags.Ephemeral
            });
        }

        const result = joinVoice(voiceChannel.id, interaction.guild);

        if (result === 1) {
            return interaction.editReply({
                content: `je suis déjà en vc casse pas les couilles`, flags: MessageFlags.Ephemeral
            },);
        }

        return interaction.editReply({
            content: `wesh **${voiceChannel.name}** bien ou quoi`,
        });
    },
},
{
    data: new SlashCommandBuilder()
        .setName('degage')
        .setDescription('Byebye piepo'),
    async execute(interaction) {
        await interaction.deferReply({});

        const result = leaveVoice();

        if (result === 1) {
            return interaction.editReply({
                content: 'je suis même pas en vc ptdr', flags: MessageFlags.Ephemeral
            });
        }

        return interaction.editReply({
            content: 'byeee',
        });
    },
},
{
    data: new SlashCommandBuilder()
        .setName('predict')
        .setDescription('Fais une prédiction')
        .addStringOption(option =>
            option
                .setName('date')
                .setDescription('example: 2067-12-31 20:00')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option
                .setName('salon')
                .setDescription('Salon dans lequel la prédiction sera révélée')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('texte')
                .setDescription('Texte de la prédiction')
                .setRequired(true)
                .setMaxLength(1000)
        ),

    async execute(interaction) {
        const dateStr = interaction.options.getString('date');
        const channel = interaction.options.getChannel('salon');
        const text = interaction.options.getString('texte');

        let revealTime;
        try {
            revealTime = new Date(dateStr).getTime();
            if (isNaN(revealTime) || revealTime <= Date.now()) {
                return interaction.reply({ content: 'Date invalide ou déjà passée.', flags: MessageFlags.Ephemeral });
            }
        } catch {
            return interaction.reply({ content: 'Format de date non reconnu.', flags: MessageFlags.Ephemeral });
        }

        const dataDir = path.join(__dirname, '..', '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const predictionsFile = path.join(dataDir, 'predictions.json');

        let predictions = [];
        if (fs.existsSync(predictionsFile)) {
            predictions = JSON.parse(fs.readFileSync(predictionsFile, 'utf-8'));
        }

        const entry = {
            id: Math.random().toString(36).slice(2),
            predictDate: new Date(dateStr).getTime(),
            channelId: channel.id,
            revealAt: revealTime,
            text: Buffer.from(text, "utf8").toString("base64"),
            authorId: interaction.user.id,
            guildId: interaction.guild.id
        };

        predictions.push(entry);
        fs.writeFileSync(predictionsFile, JSON.stringify(predictions, null, 2));

        await channel.send(
            `${interaction.user} fait une prédiction. Elle sera révélée le ` + `<t:${Math.floor(revealTime / 1000)}:F>`
        );

        await interaction.reply({
            content: `Prédiction engegistrée. Elle sera postée dans ${channel} le ` + `<t:${Math.floor(revealTime / 1000)}:F>`,
            flags: MessageFlags.Ephemeral
        });
    },
},
];

module.exports = { commands }