const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apply')
        .setDescription('Start the staff application process for California State Roleplay'),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🛡️ Staff Application')
            .setDescription('Welcome to the California State Roleplay Staff Application!\n\nI\'ve sent you a DM to begin the application process. Please check your DMs and follow the instructions there.\n\nIf you don\'t receive a DM, please make sure your DMs are open and try again.')
            .setColor('#5865F2')
            .setFooter({ text: 'California State Roleplay Staff Application' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

        // Send DM to user
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('🛡️ Staff Application')
                .setDescription('Welcome to the California State Roleplay Staff Application!\n\nThis application will ask you several questions about yourself and your knowledge of roleplay servers.\n\n**Are you sure you want to proceed with the staff application?**\n\nThis process will take approximately 5-10 minutes to complete.')
                .setColor('#5865F2')
                .setFooter({ text: 'California State Roleplay Staff Application' })
                .setTimestamp();

            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('start_application')
                        .setLabel('Start Application')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),
                    new ButtonBuilder()
                        .setCustomId('cancel_application')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                );

            await interaction.user.send({ embeds: [dmEmbed], components: [row] });
        } catch (error) {
            console.error('Failed to send DM to user:', error);
            await interaction.followUp({ 
                content: '❌ I was unable to send you a DM. Please make sure your DMs are open and try again.', 
                ephemeral: true 
            });
        }
    },
}; 