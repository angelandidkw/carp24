const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const infractionsPath = path.join(__dirname, '..', 'infractions.json');


const infractionChannelId = '1383651667966300181';
const allowedRoleId = '1383651425581793360';
const appealChannelId = '1383651598152110171';
const logoURL = 'https://cdn.discordapp.com/icons/1346524903511429234/4c888c311f1787d921d9093a0729c312.png?size=512';


if (!fs.existsSync(infractionsPath)) {
    fs.writeFileSync(infractionsPath, JSON.stringify({ lastId: 0, infractions: [] }, null, 4));
}


let infractionData;
try {
    infractionData = JSON.parse(fs.readFileSync(infractionsPath));
    if (typeof infractionData !== 'object' || !('infractions' in infractionData) || !('lastId' in infractionData)) {
        infractionData = { lastId: 0, infractions: [] };
    }
} catch (error) {
    infractionData = { lastId: 0, infractions: [] };
}


function saveInfractions() {
    fs.writeFileSync(infractionsPath, JSON.stringify(infractionData, null, 4));
}


function getNextAvailableId() {
    infractionData.lastId++;
    saveInfractions(); 
    return infractionData.lastId;
}


function removeExpiredInfractions() {
    const now = Date.now();
    infractionData.infractions = infractionData.infractions.filter(inf => {
        let expirationDate;
        const infDate = new Date(inf.date).getTime();
        switch (inf.type) {
            case 'Under Investigation':
            case 'Demotion':
            case 'Terminated':
                expirationDate = infDate + (3 * 7 * 24 * 60 * 60 * 1000); 
                break;
            default:
                expirationDate = infDate + (2 * 7 * 24 * 60 * 60 * 1000); 
        }
        return now < expirationDate;
    });
    saveInfractions();
}


setInterval(removeExpiredInfractions, 60 * 60 * 1000);


function getExpirationDisplay(expirationTimestamp) {
    const now = Date.now() / 1000;
    return now > expirationTimestamp ? 
        `Expired: ${Math.floor((now - expirationTimestamp) / 86400)} day(s) ago` : 
        `<t:${expirationTimestamp}:R>`;
}

module.exports = {
data: new SlashCommandBuilder()
    .setName('infraction')
    .setDescription('Manage staff infractions')
    .setDefaultMemberPermissions('0') 
    .addSubcommand(subcmd =>
        subcmd
            .setName('view')
            .setDescription('View a user\'s infractions')
            .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    )
    .addSubcommand(subcmd =>
        subcmd
            .setName('issue')
            .setDescription('Issue new infraction')
            .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
            .addStringOption(opt => opt.setName('reason').setDescription('Infraction reason').setRequired(true))
            .addStringOption(opt =>
                opt.setName('type')
                    .setDescription('Infraction type')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Inactivity Notice', value: 'Inactivity Notice' },
                        { name: 'Notice', value: 'Notice' },
                        { name: 'Warning', value: 'Warning' },
                        { name: 'Strike', value: 'Strike' },
                        { name: 'Under Investigation', value: 'Under Investigation' },
                        { name: 'Suspended', value: 'Suspended' },
                        { name: 'Demotion', value: 'Demotion' },
                        { name: 'Terminated', value: 'Terminated' },
                        { name: 'Blacklisted', value: 'Blacklisted' }
                    ))
            .addStringOption(opt => opt.setName('notes').setDescription('Additional notes'))
    )
    .addSubcommand(subcmd =>
        subcmd
            .setName('edit')
            .setDescription('Edit existing infraction')
            .addIntegerOption(opt => opt.setName('id').setDescription('Infraction ID').setRequired(true))
            .addStringOption(opt => opt.setName('reason').setDescription('New reason').setRequired(true))
            .addStringOption(opt =>
                opt.setName('type')
                    .setDescription('New type')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Inactivity Notice', value: 'Inactivity Notice' },
                        { name: 'Notice', value: 'Notice' },
                        { name: 'Warning', value: 'Warning' },
                        { name: 'Strike', value: 'Strike' },
                        { name: 'Under Investigation', value: 'Under Investigation' },
                        { name: 'Suspended', value: 'Suspended' },
                        { name: 'Demotion', value: 'Demotion' },
                        { name: 'Terminated', value: 'Terminated' },
                        { name: 'Blacklisted', value: 'Blacklisted' }
                    ))
            .addStringOption(opt => opt.setName('notes').setDescription('New notes'))
    )
    .addSubcommand(subcmd =>
        subcmd
            .setName('delete')
            .setDescription('Delete infraction')
            .addIntegerOption(opt => opt.setName('id').setDescription('Infraction ID').setRequired(true))
    ),
   
    async execute(interaction) {
        
        if (!interaction.member.roles.cache.has(allowedRoleId)) {
            return interaction.reply({ content: '<:sfrp_exclamation:1363616220800094510> Insufficient permissions', ephemeral: true });
        }

        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Appeal Infraction')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/channels/1369403919293485188/1369404727758028913`),
                new ButtonBuilder()
                    .setCustomId('info')
                    .setLabel('Sent From: California State Roleplay')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );

        const subcmd = interaction.options.getSubcommand();
        
        try {
            switch (subcmd) {
                case 'view': {
                    const user = interaction.options.getUser('user');
                    const userInfractions = infractionData.infractions.filter(inf => inf.userId === user.id);
                    
                    if (!userInfractions.length) {
                        return interaction.reply({ content: `No infractions found for ${user.tag}`, ephemeral: true });
                    }

                    const embed = new EmbedBuilder()
                        .setTitle('Infraction Records')
                        .setDescription(`**Staff Member:** ${user.tag}`)
                        .setColor(0x2d2d31)
                        .setThumbnail(user.displayAvatarURL());

                    userInfractions.forEach(inf => {
                        embed.addFields(
                            { name: 'Case:', value: `#${inf.id}`, inline: true },
                            { name: 'Punishment:', value: inf.type, inline: true },
                            { name: 'Date:', value: `<t:${Math.floor(new Date(inf.date).getTime() / 1000)}:F>`, inline: true },
                            { name: 'Issued by:', value: `<@${inf.issuerId}>`, inline: true },
                            { name: 'Reason:', value: inf.reason, inline: false },
                            { name: 'Notes:', value: inf.notes || 'None', inline: false },
                            { name: 'Expiration:', value: getExpirationDisplay(inf.expiration), inline: false }
                        );
                    });

                    return interaction.reply({ embeds: [embed], ephemeral: false });
                }

                case 'issue': {
                    await interaction.deferReply({ ephemeral: true });
                    const user = interaction.options.getUser('user');
                    const reason = interaction.options.getString('reason');
                    const type = interaction.options.getString('type');
                    const notes = interaction.options.getString('notes') || 'None';

                    
                    const expirationTime = ['Under Investigation', 'Demotion', 'Terminated'].includes(type) ? 
                        3 * 7 * 24 * 60 * 60 * 1000 : 
                        2 * 7 * 24 * 60 * 60 * 1000;  

                    const infraction = {
                        id: getNextAvailableId(),  
                        userId: user.id,
                        reason,
                        type,
                        date: new Date().toISOString(),
                        expiration: Math.floor((Date.now() + expirationTime) / 1000),
                        issuerId: interaction.user.id,
                        notes
                    };

                    infractionData.infractions.push(infraction);
                    saveInfractions();

                    
                    const embed = new EmbedBuilder()
                        .setTitle('Staff Punishment')
                        .setColor(0x2d2d31)
                        .setThumbnail(logoURL)
                        .addFields(
                            { name: 'Case ID', value: `#${infraction.id}`, inline: true },
                            { name: 'Type', value: type, inline: true },
                            { name: 'Issued Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                            { name: 'Staff Member', value: user.tag, inline: true },
                            { name: 'Reason', value: reason, inline: false },
                            { name: 'Notes', value: notes, inline: false },
                            { name: 'Expiration', value: getExpirationDisplay(infraction.expiration), inline: false }
                        )
                        .setFooter({ 
                            text: `Issued by: ${interaction.user.tag}`, 
                            iconURL: interaction.user.displayAvatarURL() 
                        });

                    
                    try {
                        await user.send({ embeds: [embed], components: [buttons] });
                    } catch (error) {
                        console.error(`DM failed for ${user.tag}:`, error);
                    }

                    const logChannel = interaction.client.channels.cache.get(infractionChannelId);
                    if (logChannel) {
                        await logChannel.send({ embeds: [embed], components: [buttons] });
                    }

                    return interaction.editReply({
                        content: `<:checkmark:1384611414949499040> Infraction #${infraction.id} issued to ${user.tag}`,
                        embeds: [embed],
                        components: [buttons]
                    });
                }

                case 'edit': {
                    await interaction.deferReply({ ephemeral: true });
                    const id = interaction.options.getInteger('id');
                    const reason = interaction.options.getString('reason');
                    const type = interaction.options.getString('type');
                    const notes = interaction.options.getString('notes') || 'None';

                    const index = infractionData.infractions.findIndex(inf => inf.id === id);
                    if (index === -1) {
                        return interaction.editReply({ content: `<:sfrp_exclamation:1363616220800094510> Infraction #${id} not found` });
                    }

                    
                    infractionData.infractions[index] = {
                        ...infractionData.infractions[index],
                        reason,
                        type,
                        notes,
                        date: new Date().toISOString()
                    };
                    saveInfractions();

                    
                    const embed = new EmbedBuilder()
                        .setTitle('<:checkmark:1384611414949499040> Infraction Updated')
                        .setColor(0x2d2d31)
                        .setThumbnail(logoURL)
                        .addFields(
                            { name: 'Case ID', value: `#${id}`, inline: true },
                            { name: 'New Type', value: type, inline: true },
                            { name: 'Updated Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                            { name: 'New Reason', value: reason, inline: false },
                            { name: 'New Notes', value: notes, inline: false },
                            { name: 'Expiration', value: getExpirationDisplay(infractionData.infractions[index].expiration), inline: true }
                        )
                        .setFooter({ 
                            text: `Modified by: ${interaction.user.tag}`, 
                            iconURL: interaction.user.displayAvatarURL() 
                        });

                    
                    try {
                        const user = await interaction.client.users.fetch(infractionData.infractions[index].userId);
                        await user.send({ embeds: [embed], components: [buttons] });
                    } catch (error) {
                        console.error('Failed to notify user:', error);
                    }

                    
                    const logChannel = interaction.client.channels.cache.get(infractionChannelId);
                    if (logChannel) {
                        await logChannel.send({ embeds: [embed], components: [buttons] });
                    }

                    return interaction.editReply({
                        content: `<:checkmark:1384611414949499040> Infraction #${id} updated`,
                        embeds: [embed],
                        components: [buttons]
                    });
                }

                case 'delete': {
                    await interaction.deferReply({ ephemeral: true });
                    const id = interaction.options.getInteger('id');
                    const index = infractionData.infractions.findIndex(inf => inf.id === id);

                    if (index === -1) {
                        return interaction.editReply({ content: `<:sfrp_exclamation:1363616220800094510> Infraction #${id} not found` });
                    }

                    const [deleted] = infractionData.infractions.splice(index, 1);
                    saveInfractions();

                    
                    const embed = new EmbedBuilder()
                        .setTitle('Infraction Deleted')
                        .setColor(0x2d2d31)
                        .setThumbnail(logoURL)
                        .addFields(
                            { name: 'Case ID', value: `#${id}`, inline: true },
                            { name: 'Original Type', value: deleted.type, inline: true },
                            { name: 'Original Reason', value: deleted.reason, inline: false },
                            { name: 'Deleted By', value: interaction.user.tag, inline: true }
                        )
                        .setFooter({ 
                            text: `Staff Member: ${interaction.client.users.cache.get(deleted.userId)?.tag || 'Unknown'}`, 
                            iconURL: interaction.user.displayAvatarURL() 
                        });

                    
                    const logChannel = interaction.client.channels.cache.get(infractionChannelId);
                    if (logChannel) {
                        await logChannel.send({ embeds: [embed] });
                    }

                    return interaction.editReply({
                        content: `<:checkmark:1384611414949499040> Infraction #${id} deleted`,
                        embeds: [embed]
                    });
                }

                default:
                    return interaction.reply({ content: '<:sfrp_exclamation:1363616220800094510> Unknown subcommand', ephemeral: true });
            }
        } catch (error) {
            console.error('Infraction System Error:', error);
            return interaction.reply({ 
                content: 'An error occurred while processing your request', 
                ephemeral: true 
            });
        }
    }
};