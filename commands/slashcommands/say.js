const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Make the bot say something')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to say')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        // Check if user has permission to use the command
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return; // Silent return - no message sent
        }

        const message = interaction.options.getString('message');

        try {
            // Defer the reply first to prevent interaction timeout
            await interaction.deferReply({ ephemeral: true });
            
            // Send the message
            await interaction.channel.send(message);
            
            // Edit the deferred reply
            await interaction.editReply({
                content: 'Message sent!',
                ephemeral: true
            });
        } catch (error) {
            console.error('Error in say command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'There was an error executing the command.',
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: 'There was an error executing the command.',
                    ephemeral: true
                });
            }
        }
    },
}; 