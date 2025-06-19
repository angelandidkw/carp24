const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'say',
    async execute(message, args) {
        // Check if user has permission to use the command
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return; // Silent return - no message sent
        }

        // Get the message content (everything after the command)
        const content = args.join(' ');
        
        if (!content) {
            return message.reply('Please provide a message to say.').then(msg => {
                setTimeout(() => msg.delete().catch(() => {}), 5000);
            });
        }

        try {
            // Delete the original command message
            await message.delete();
            
            // Send the message
            await message.channel.send(content);
        } catch (error) {
            console.error('Error in say command:', error);
            message.reply('There was an error executing the command.').then(msg => {
                setTimeout(() => msg.delete().catch(() => {}), 5000);
            });
        }
    },
}; 