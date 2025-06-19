const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

const STAFF_APP_CHANNEL_ID = '1383651425581793360';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staffapp')
        .setDescription('Handle staff applications')
        .addUserOption(option =>
            option.setName('applicant')
                .setDescription('The applicant to handle')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Accept or deny the application')
                .setRequired(true)
                .addChoices(
                    { name: 'Accept', value: 'accept' },
                    { name: 'Deny', value: 'deny' }
                ))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the decision')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Check if command is used in the correct channel
        if (interaction.channelId !== STAFF_APP_CHANNEL_ID) {
            return interaction.reply({ 
                content: `This command can only be used in the staff applications channel.`, 
                ephemeral: true 
            });
        }

        const applicant = interaction.options.getUser('applicant');
        const action = interaction.options.getString('action');
        const reason = interaction.options.getString('reason');

        const embed = new EmbedBuilder()
            .setColor(action === 'accept' ? '#00FF00' : '#FF0000')
            .setTitle(`Staff Application ${action === 'accept' ? 'Accepted' : 'Denied'}`)
            .setDescription(`Application for ${applicant} has been ${action === 'accept' ? 'accepted' : 'denied'}.`)
            .addFields(
                { name: 'Reason', value: reason },
                { name: 'Handled by', value: interaction.user.tag }
            )
            .setImage('https://cdn.discordapp.com/attachments/1384567141558259752/1384586384924475503/GSRP_Commission_Promotions.png')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
}; 