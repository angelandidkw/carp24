const REQUIRED_ROLE_ID = '1383651425581793360';

module.exports = {
    name: 'purge',
    async execute(message, args) {
        // Check if user has the required role
        if (!message.member.roles.cache.has(REQUIRED_ROLE_ID)) {
            return; // Silent return - no message sent
        }

        const amount = parseInt(args[0], 10);
        if (isNaN(amount) || amount < 1 || amount > 100) {
            return message.reply('❌ Please provide a number between 1 and 100.');
        }

        try {
            await message.channel.bulkDelete(amount, true);
            message.channel.send(`<:checkmark:1384611414949499040> Successfully deleted \`${amount}\` messages.`)
                .then(msg => setTimeout(() => msg.delete(), 5000));
        } catch (err) {
            console.error(err);
            message.reply('❌ There was an error trying to purge messages in this channel!');
        }
    },
}; 