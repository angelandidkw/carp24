const { PermissionsBitField, ButtonBuilder, ActionRowBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const REQUIRED_ROLE_ID = '1383651425581793360'; // Admin role that can use this command

module.exports = {
    name: 'setup',
    description: 'Setup the ban appeal system',
    async execute(message, args) {
        // Delete the command message
        await message.delete().catch(console.error);

        // Check if user has the required role
        if (!message.member.roles.cache.has(REQUIRED_ROLE_ID)) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('You do not have permission to use this command!')
                .setColor('#FF0000');
            return message.author.send({ embeds: [errorEmbed] }).catch(console.error);
        }

        const channel = message.mentions.channels.first() || message.channel;

        // Create the ban appeal button
        const button = new ButtonBuilder()
            .setCustomId('ban_appeal')
            .setLabel('Ban Appeal')
            .setEmoji('1324117528657657887')
            .setStyle(ButtonStyle.Secondary);

        // Create action row with the button
        const row = new ActionRowBuilder()
            .addComponents(button);

        // Create embed for the ban appeal message
        const embed = new EmbedBuilder()
            .setTitle('Game Ban Appeal')
            .setDescription('Select the button below to submit an in-game ban appeal.')
            .setColor('#2d2d31');

        try {
            const msg = await channel.send({
                embeds: [embed],
                components: [row]
            });

            // Store ban appeal message info in client for reference
            message.client.banAppealMessage = {
                channelId: channel.id,
                messageId: msg.id
            };
            
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Setup Complete')
                .setDescription(`Ban appeal system has been setup successfully in ${channel}!`)
                .setColor('#00FF00')
                .setTimestamp();

            await message.author.send({ embeds: [successEmbed] });
        } catch (error) {
            console.error('Error setting up ban appeal:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('There was an error setting up the ban appeal system!')
                .setColor('#FF0000')
                .setTimestamp();

            await message.author.send({ embeds: [errorEmbed] });
        }
    },
};