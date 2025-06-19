const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dm')
        .setDescription('Send a direct message to a member')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to send the message to')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to send')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers), // Only users with moderate members permission can use this

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const message = interaction.options.getString('message');

        try {
            // Send the DM
            await targetUser.send(message);
            
            // Reply to the command user
            await interaction.reply({
                content: `Successfully sent message to ${targetUser.tag}`,
                ephemeral: true // Only visible to the command user
            });
        } catch (error) {
            console.error('Error sending DM:', error);
            await interaction.reply({
                content: `Failed to send message to ${targetUser.tag}. They might have DMs disabled.`,
                ephemeral: true
            });
        }
    },
}; 