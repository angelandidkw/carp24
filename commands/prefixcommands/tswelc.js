const WELCOME_CHANNEL_ID = '1383651633488990233'; // Same as in the event
const WELCOME_GUILD_NAME = 'California State Roleplay';
const REQUIRED_ROLE_ID = '1383651425581793360';

module.exports = {
    name: 'tswlc',
    async execute(message) {
        // Check if user has the required role
        if (!message.member.roles.cache.has(REQUIRED_ROLE_ID)) {
            return; // Silent return - no message sent
        }

        const channel = message.guild.channels.cache.get(WELCOME_CHANNEL_ID);
        if (!channel) return message.reply('Welcome channel not found.');
        const memberCount = message.guild.memberCount;
        await channel.send(`Welcome to **${WELCOME_GUILD_NAME}** ${message.member}, we hope you enjoy your stay here! We now have \`${memberCount}\` members.`);
    },
}; 