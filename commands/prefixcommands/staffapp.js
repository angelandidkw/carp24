const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const STAFF_APP_CHANNEL_ID = '1383651685829840947';

module.exports = {
    name: 'staffapp',
    description: 'Handle staff applications',
    async execute(message, args) {
        // Check if command is used in the correct channel
        if (message.channelId !== STAFF_APP_CHANNEL_ID) {
            return message.reply('This command can only be used in the staff applications channel.');
        }

        // Check if user has admin permissions
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('You do not have permission to use this command.');
        }

        // Check if all required arguments are provided
        if (args.length < 3) {
            return message.reply('Usage: !staffapp <@user> <accept/deny> <reason>');
        }

        const applicant = message.mentions.users.first();
        if (!applicant) {
            return message.reply('Please mention a valid user.');
        }

        const action = args[1].toLowerCase();
        if (action !== 'accept' && action !== 'deny') {
            return message.reply('Action must be either "accept" or "deny".');
        }

        const reason = args.slice(2).join(' ');

        const embed = new EmbedBuilder()
            .setColor(action === 'accept' ? '#00FF00' : '#FF0000')
            .setTitle(`Staff Application ${action === 'accept' ? 'Accepted' : 'Denied'}`)
            .setDescription(`Application for ${applicant} has been ${action === 'accept' ? 'accepted' : 'denied'}.`)
            .addFields(
                { name: 'Reason', value: reason },
                { name: 'Handled by', value: message.author.tag }
            )
            .setImage('https://cdn.discordapp.com/attachments/1384567141558259752/1384586384924475503/GSRP_Commission_Promotions.png')
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    },
}; 