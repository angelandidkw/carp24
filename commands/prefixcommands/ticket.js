const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

const REQUIRED_ROLE_ID = '1383651425581793360';

module.exports = {
    name: 'ticket',
    async execute(message) {
        // Check if user has the required role
        if (!message.member.roles.cache.has(REQUIRED_ROLE_ID)) {
            return; // Silent return - no message sent
        }

        try {
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_support_type')
                    .setPlaceholder('Select a support type...')
                    .addOptions([
                        {
                            label: 'General',
                            value: 'general',
                            description: 'General support ticket',
                        },
                        {
                            label: 'Internal Affairs',
                            value: 'internal_affairs',
                            description: 'Internal Affairs support ticket',
                        },
                        {
                            label: 'Management',
                            value: 'management',
                            description: 'Management support ticket',
                        },
                    ])
            );

            await message.channel.send({
                content: 'Please select a support type from dropdown below to create your support ticket.',
                components: [row],
            });
        } catch (error) {
            console.error('Error in ticket command:', error);
            await message.reply('There was an error creating the ticket menu.');
        }
    },
}; 