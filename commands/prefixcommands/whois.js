const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'whois',
    async execute(message, args) {
        let member;
        // Try mention
        if (message.mentions.members.first()) {
            member = message.mentions.members.first();
        } else if (args[0]) {
            // Try user ID
            member = await message.guild.members.fetch(args[0]).catch(() => null);
            // Try username if not found by ID
            if (!member) {
                const search = args.join(' ').toLowerCase();
                member = message.guild.members.cache.find(m => m.user.username.toLowerCase() === search || m.user.tag.toLowerCase() === search);
            }
        }
        // Default to message author
        if (!member) member = message.member;
        const user = member.user;

        // Get user roles, filter out @everyone, and join them
        const userRoles = member.roles.cache
            .filter(role => role.id !== message.guild.id)
            .map(role => role.toString())
            .join(' ') || 'No roles';

        const embed = new EmbedBuilder()
            .setColor(member.displayHexColor || '2d2d31')
            .setTitle(`User Information: ${user.tag}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: 'Username', value: user.tag, inline: true },
                { name: 'User ID', value: user.id, inline: true },
                { name: '\u200B', value: '\u200B', inline: true },
                { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: 'Highest Role', value: member.roles.highest.toString(), inline: true},
                { name: `Roles [${member.roles.cache.size - 1}]`, value: userRoles, inline: false },
            )
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    },
};