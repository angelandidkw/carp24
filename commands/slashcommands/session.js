const { SlashCommandBuilder } = require('@discordjs/builders');
const { 
    CommandInteraction, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ModalBuilder, 
    TextInputBuilder,
    TextInputStyle,
    ButtonStyle
} = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const ERLC_API_BASE_URL = 'https://api.erlc.com/v1';
const ERLC_SERVER_KEY = process.env.ERLC_SERVER_KEY;

const hasRequiredRole = (member) => {
    const configPath = path.join(__dirname, '../../config.json');
    try {
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return member.roles.cache.has(config.session?.staffRoleId || '1384612362589311167');
        }
    } catch (error) {
        console.error('Error reading config:', error);
    }
    return member.roles.cache.has('1384612362589311167'); // Fallback to default
};

let sessionActive = false;
let votes = [];
let votingLocked = false;

// Function to get session role ID from config
const getSessionRoleId = () => {
    const configPath = path.join(__dirname, '../../config.json');
    try {
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return config.session?.roleId || '1384612362589311167'; // Default role ID as fallback
        }
    } catch (error) {
        console.error('Error reading config:', error);
    }
    return '1384612362589311167'; // Default role ID as fallback
};

const fetchPlayerCount = async () => {
    try {
        const url = `${ERLC_API_BASE_URL}/server`;
        const response = await axios.get(url, {
            headers: {
                'Server-Key': ERLC_SERVER_KEY
            }
        });

        if (response.status !== 200) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        const data = response.data;
        if (!data || typeof data.CurrentPlayers === 'undefined') {
            throw new Error('Invalid API response format');
        }
        return data.CurrentPlayers.toString();
    } catch (error) {
        console.error('Error fetching player count:', error);
        throw error;
    }
};


const updateStaffCount = async (guild) => {
    try {
        const configPath = path.join(__dirname, '../../config.json');
        let targetRoleID = '1384612362589311167'; // Default fallback
        
        try {
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                targetRoleID = config.session?.staffRoleId || targetRoleID;
            }
        } catch (error) {
            console.error('Error reading config:', error);
        }

        await guild.members.fetch({ force: true }); 

        const membersWithRole = guild.members.cache.filter(member => 
            member.roles.cache.has(targetRoleID) && 
            member.presence?.status !== 'offline' 
        );

        const count = membersWithRole.size;
        return count > 0 ? count.toString() : 'No staff online';
    } catch (error) {
        console.error('Error updating staff count:', error);
        return 'Error fetching staff count';
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('session')
        .setDescription('Server management commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('shutdown')
                .setDescription('Announces that the server is shutting down.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('vote')
                .setDescription('Initiate a session vote')
                .addIntegerOption(option => 
                    option.setName('votesneeded')
                        .setDescription('Number of votes needed to start the session')
                        .setRequired(true)
                ))
        .addSubcommand(subcommand =>
            subcommand
                .setName('full')
                .setDescription('Announces that the server is full.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('startup')
                .setDescription('Announces that a session has started'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('live')
                .setDescription('Shows session information and status')),
    /**
     * @param {CommandInteraction} interaction
     */
    async execute(interaction) {

        if (!hasRequiredRole(interaction.member)) {
            return interaction.reply({ 
                content: 'You do not have permission to use this command.', 
                ephemeral: true 
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'shutdown') {
            console.log('Executing shutdown subcommand');
            const allowedRoleID = '1384612362589311167';
            const isAllowedUser = interaction.member.roles.cache.has(allowedRoleID);

            if (isAllowedUser) {
                try {
                    const shutdownTime = Math.floor(Date.now() / 1000);
					const relativeTime = `<t:${shutdownTime}:R>`;
                    const avatarURL = interaction.user.displayAvatarURL();

                    const embed = new EmbedBuilder()
                        .setColor('2d2d31')
                         .setAuthor({ 
      						name: `Requested by ${interaction.user.tag}`, 
       						iconURL: avatarURL 
  						  })
                        .setDescription(`# <:GSRP:1264351681764655144> Server Shutdown:\n\n> As of **<t:${shutdownTime}:R>**, the in-game server is now shutdown. Please do not join the server while the server is down.\n\n> Another session will commence in the near future, be sure to obtain the <@&${getSessionRoleId()}> role below to get notified for the next session.`)
                        .setImage('https://i.imgur.com/example1.png')

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('get_session_role')
                                .setLabel('Sessions')
                                .setEmoji({ id: '1176268725507334184' })
                                .setStyle(ButtonStyle.Secondary)
                        );

                    await interaction.deferReply();

                    const msg = await interaction.followUp({
                        embeds: [embed],
                        components: [row],
                        fetchReply: true
                    });

                    
                    const collector = msg.createMessageComponentCollector({ 
                        filter: i => i.customId === 'get_session_role',
                        time: 24 * 60 * 60 * 1000
                    });

                    collector.on('collect', async i => {
                        try {
                            const member = await interaction.guild.members.fetch(i.user.id);
                            const role = await interaction.guild.roles.fetch(getSessionRoleId());

                            if (member.roles.cache.has(role.id)) {
                                await i.reply({ content: 'You already have the session role!', ephemeral: true });
                            } else {
                                await member.roles.add(role);
                                await i.reply({ content: 'You have been given the session role!', ephemeral: true });
                            }
                        } catch (error) {
                            console.error('Error giving role:', error);
                            await i.reply({ content: 'There was an error giving you the role. Please contact an administrator.', ephemeral: true });
                        }
                    });

                    const interval = setInterval(() => {
                        const relativeTime = `<t:${shutdownTime}:R>`;
                        embed.setDescription(`# <:GSRP:1264351681764655144> Server Shutdown:\n\n> As of **<t:${shutdownTime}:R>**, the in-game server is now shutdown. Please do not join the server while the server is down.\n\n> Another session will commence in the near future, be sure to obtain the <@&${getSessionRoleId()}> role below to get notified for the next session.`);
                        msg.edit({ embeds: [embed], components: [row] });
                    }, 1000);

                    setTimeout(() => clearInterval(interval), 60000);

                } catch (error) {
                    console.error('Error sending shutdown message:', error);
                    await interaction.followUp({ content: 'There was an error sending the shutdown message.', ephemeral: true });
                }
            } else {
                await interaction.reply({ content: 'You do not have permission to use this subcommand.', ephemeral: true });
            }
        } else if (subcommand === 'vote') {
            console.log('Executing vote subcommand');

            const requiredPermissions = ["MENTION_EVERYONE", "SEND_MESSAGES"];
            const botPermissions = interaction.channel.permissionsFor(interaction.client.user);
            
            if (!requiredPermissions.every(permission => botPermissions.has(permission))) {
                await interaction.reply({ content: `I need the following permissions to execute this command: ${requiredPermissions.join(", ")}`, ephemeral: true });
                return;
            }
            
            const votesNeeded = interaction.options.getInteger('votesneeded');
            if (!votesNeeded || votesNeeded <= 0) {
                await interaction.reply({ content: 'Please provide a valid number of votes needed (greater than 0).', ephemeral: true });
                return;
            }
            
            const voteup = Math.floor(Date.now() / 1000);
            const relativeTime = `<t:${voteup}:R>`;
            votes = [];
            votingLocked = false;
            
            const embed = new EmbedBuilder()
                .setColor(2829617)
                .setDescription(`\# <:GSRP:1264351681764655144> Session Vote:\n\n > As of **<t:${voteup}:R>** a session vote has been initiated we need **${votesNeeded}** to to start-up the server. Vote below if you would like a session start-up, if you vote you must join the server for at least 15 minutes otherwise you'll face moderation.\n\n**Current Votes:** ${votes.length}`)
                .setImage('https://i.imgur.com/example2.png')
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('vote_yes')
                        .setLabel(`(0/${votesNeeded})`)
                        .setEmoji({ name: 'whitecheck', id: '1267288609598214247' })
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('view_voters')
                        .setLabel('View Voters')
                        .setStyle(ButtonStyle.Secondary)
                );
            
            try {
                await interaction.deferReply();

                
                await interaction.channel.send({
                    content: `<@&${getSessionRoleId()}> @here A session vote has started!`,
                    allowedMentions: { parse: ['everyone', 'roles'] }
                });

                const followUpMessage = await interaction.followUp({
                    embeds: [embed],
                    components: [row],
                    fetchReply: true
                });

                const filter = i => ['vote_yes', 'view_voters'].includes(i.customId) && !i.user.bot;
                const collector = followUpMessage.createMessageComponentCollector({ filter, time: 24 * 60 * 60 * 1000 });
            
                collector.on('collect', async i => {
                    if (i.customId === 'vote_yes') {
                        let replyMessage = '';

                        if (votes.includes(i.user.id)) {
                            votes = votes.filter(voterID => voterID !== i.user.id);
                            replyMessage = 'Your vote has been removed.';
                        } else {
                            votes.push(i.user.id);
                            replyMessage = 'Thank you for your vote!';
                        }
            
                        await i.reply({ content: replyMessage, ephemeral: true });
            
                        embed.setDescription(`\# <:GSRP:1264351681764655144> Session Vote:\n\n > As of **<t:${voteup}:R>** a session vote has been initiated we need **${votesNeeded}** to to start-up the server. Vote below if you would like a session start-up, if you vote you must join the server for at least 15 minutes otherwise you'll face moderation.\n\n**Current Votes:** ${votes.length}`);
            
                        const rowComponents = [
                            new ButtonBuilder()
                                .setCustomId('vote_yes')
                                .setLabel(`(${votes.length}/${votesNeeded})`)
                                .setEmoji({ name: 'whitecheck', id: '1267288609598214247' })
                                .setStyle(ButtonStyle.Success)
                                .setDisabled(votes.length >= votesNeeded),
                            new ButtonBuilder()
                                .setCustomId('view_voters')
                                .setLabel('View Voters')
                                .setStyle(ButtonStyle.Secondary)
                        ];
            
                        if (votes.length >= votesNeeded) {
                            votingLocked = true;
                            sessionActive = true;
                            collector.stop();
                        }
            
                        try {
                            await followUpMessage.fetch();
                            await followUpMessage.edit({
                                embeds: [embed],
                                components: [new ActionRowBuilder().addComponents(rowComponents)]
                            });
                        } catch (error) {
                            if (error.code === 10008) {
                                console.log('Vote message no longer exists');
                                collector.stop();
                            } else {
                                console.error('Error updating vote message:', error);
                            }
                        }
                    } else if (i.customId === 'view_voters') {
                        const voterList = votes.map(voterID => `<@${voterID}>`) || 'No votes yet.';
                        await i.reply({ content: `Voters:\n${voterList}`, ephemeral: true });
                    }
                });
            
                collector.on('end', async () => {
                    const lockedRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('vote_yes')
                                .setLabel(`(${votes.length}/${votesNeeded})`)
                                .setEmoji({ name: 'whitecheck', id: '1267288609598214247' })
                                .setStyle(ButtonStyle.Success)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('view_voters')
                                .setLabel('View Voters')
                                .setStyle(ButtonStyle.Secondary)
                        );
            
                    await followUpMessage.edit({
                        embeds: [embed],
                        components: [lockedRow],
                        allowedMentions: { parse: ['everyone', 'roles'] }
                    });
                });
            } catch (error) {
                console.error('Error executing vote subcommand:', error);
                await interaction.followUp({ content: 'There was an error executing the vote subcommand.', ephemeral: true });
            }
        } else if (subcommand === 'full') {
            console.log('Executing full subcommand');  
            const startupTime = Math.floor(Date.now() / 1000);
            const embed = new EmbedBuilder()
                .setColor('2d2d31')
                .setTitle('Server Full:')
                .setDescription(`As of **<t:${startupTime}:R>** the in-game server is now full! We appreciate everyone for the full session!`)
                .setImage('https://i.imgur.com/example3.png')

            try {
                await interaction.deferReply();
                await interaction.followUp({ embeds: [embed], allowedMentions: { parse: ['everyone', 'roles'] } });
            } catch (error) {
                console.error('Error sending server full message:', error);
                await interaction.followUp({ content: 'There was an error sending the server full message.', ephemeral: true });
            }
        } else if (subcommand === 'startup') {
            console.log('Executing startup subcommand');
            setSessionState(true);

            const allowedRoleID = '1384612362589311167';
            const isAllowedUser = interaction.member.roles.cache.has(allowedRoleID);

            if (isAllowedUser) {
                try {
                    await interaction.deferReply();

                    const avatarURL = interaction.user.displayAvatarURL();
                    const startupTime = Math.floor(Date.now() / 1000);
                    const guild = interaction.guild;
                    
                    let staffCount = await updateStaffCount(guild);
                    let playerCount = 'N/A';

                    try {
                        playerCount = await fetchPlayerCount();
                    } catch (error) {
                        console.error('Error fetching player count:', error);
                    }

                    const embed = new EmbedBuilder()
                        .setColor(2829617)
                        .setDescription(`\# <:GSRP:1264351681764655144> Session Start-up\n\n> A session has been initiated at **<t:${startupTime}:R>**. Feel free to begin joining up for an immersive and realistic roleplay experience. If you voted during the voting time frame above you are required to join otherwise you will be moderated.\n\n**Server Name:** \` Florida State Roleplay | Strict | Professional \`\n**Server Owner:** \` JohnWMaxwell \`\n**Join code:** \` garoleplay \`\n\n**Live Server Information:**`)
                        .addFields(
                            { name: "Player Count:", value: `**${playerCount}**`, inline: true },
                            { name: "Staff:", value: `${staffCount}`, inline: true },
                            { name: "Last Updated:", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                        )
                        .setImage('https://i.imgur.com/example4.png')

                    const joinButton = new ButtonBuilder()
                        .setLabel('Quick Join')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://i.imgur.com/example5.png')

                    const requestPermissionButton = new ButtonBuilder()
                        .setCustomId('request_permission')
                        .setLabel('Request Permission')
                        .setStyle(ButtonStyle.Success);

                    const row = new ActionRowBuilder()
                        .addComponents(joinButton, requestPermissionButton);

                    const msg = await interaction.followUp({
                        embeds: [embed],
                        components: [row],
                        fetchReply: true
                    });

                    
                    const finalVoters = votes.map(voterID => `<@${voterID}>`).join(' ') || 'None';
                    await interaction.channel.send({
                        content: `@here <@&${getSessionRoleId()}>\n-# **Voters:** ${finalVoters}`,
                        allowedMentions: { parse: ['everyone', 'roles'] }
                    });

                    
                    for (const voterID of votes) {
                        try {
                            const voter = await interaction.guild.members.fetch(voterID);
                            const dmEmbed = new EmbedBuilder()
                                .setColor('2d2d31')
                                .setTitle('Session Started!')
                                .setDescription('A session you voted for in Florida State Roleplay has started! You are required to join or you will face moderation actions!.');

                            const dmRow = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setLabel('Join Now')
                                        .setStyle(ButtonStyle.Link)
                                        .setURL('https://i.imgur.com/example6.png')
                                );

                            await voter.send({
                                embeds: [dmEmbed],
                                components: [dmRow]
                            });
                        } catch (error) {
                            console.error(`Failed to send DM to voter ${voterID}:`, error);
                        }
                    }

                    
                    const filter = i => i.customId === 'request_permission' && !i.user.bot;
                    const collector = msg.createMessageComponentCollector({ filter, time: 24 * 60 * 60 * 1000 });

                    collector.on('collect', async i => {
                        if (i.customId === 'request_permission') {
                            try {
                                const modal = new ModalBuilder()
                                    .setCustomId('permission_request_modal')
                                    .setTitle('Permission Request Form');

                                const robloxUsernameInput = new TextInputBuilder()
                                    .setCustomId('roblox_username')
                                    .setLabel('Roblox Username')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('Enter your Roblox username')
                                    .setRequired(true);

                                const durationInput = new TextInputBuilder()
                                    .setCustomId('duration')
                                    .setLabel('Duration')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('Enter the duration (e.g., 1 hour, 30 minutes)')
                                    .setRequired(true);

                                const roleplayRequestInput = new TextInputBuilder()
                                    .setCustomId('roleplay_request')
                                    .setLabel('Roleplay Request')
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setPlaceholder('Enter the roleplay you are requesting')
                                    .setRequired(true);

                                const locationInput = new TextInputBuilder()
                                    .setCustomId('location')
                                    .setLabel('Location (Optional)')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('Enter the location (if applicable)')
                                    .setRequired(false);

                                const firstActionRow = new ActionRowBuilder().addComponents(robloxUsernameInput);
                                const secondActionRow = new ActionRowBuilder().addComponents(durationInput);
                                const thirdActionRow = new ActionRowBuilder().addComponents(roleplayRequestInput);
                                const fourthActionRow = new ActionRowBuilder().addComponents(locationInput);

                                modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow);

                                await i.showModal(modal);

                                const modalSubmission = await i.awaitModalSubmit({
                                    filter: (interaction) => interaction.customId === 'permission_request_modal',
                                    time: 60000
                                }).catch(() => null);

                                if (modalSubmission) {
                                    const robloxUsername = modalSubmission.fields.getTextInputValue('roblox_username');
                                    const duration = modalSubmission.fields.getTextInputValue('duration');
                                    const roleplayRequest = modalSubmission.fields.getTextInputValue('roleplay_request');
                                    const location = modalSubmission.fields.getTextInputValue('location');

                                    await modalSubmission.reply({
                                        content: 'Your permission request has been submitted!',
                                        ephemeral: true
                                    });
                                }
                            } catch (error) {
                                console.error('Error handling modal:', error);
                                await i.reply({
                                    content: 'There was an error processing your request.',
                                    ephemeral: true
                                }).catch(() => {});
                            }
                        }
                    });

                    
                    const updateEmbed = async () => {
                        try {
                            let newStaffCount = 'Updating...';
                            let newPlayerCount = 'Updating...';

                            try {
                                newStaffCount = await updateStaffCount(guild);
                            } catch (error) {
                                console.error('Error updating staff count:', error);
                                newStaffCount = 'Error fetching staff count';
                            }

                            try {
                                newPlayerCount = await fetchPlayerCount();
                            } catch (error) {
                                console.error('Error fetching player count:', error);
                                newPlayerCount = 'Error fetching player count';
                            }

                            const updatedEmbed = EmbedBuilder.from(embed)
                                .spliceFields(0, 3, [
                                    { name: "Player Count:", value: `**${newPlayerCount}**`, inline: true },
                                    { name: "Staff:", value: `${newStaffCount}`, inline: true },
                                    { name: "Last Updated:", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                                ]);

                            if (msg.editable) {
                                await msg.edit({
                                    embeds: [updatedEmbed],
                                    components: [row]
                                });
                            }
                        } catch (error) {
                            console.error('Error in updateEmbed:', error);
                        }
                    };

                    const interval = setInterval(updateEmbed, 120000);
                    setTimeout(() => {
                        clearInterval(interval);
                    }, 24 * 60 * 60 * 1000);

                } catch (error) {
                    console.error('Error executing startup subcommand:', error);
                    await interaction.followUp({
                        content: 'There was an error starting the session.',
                        ephemeral: true
                    });
                }
            } else {
                await interaction.reply({
                    content: 'You do not have permission to use this command.',
                    ephemeral: true
                });
            }
        } else if (subcommand === 'live') {
            console.log('Executing live subcommand');
            try {
                const imageembed = new EmbedBuilder()
                    .setColor('2d2d31')
                    .setImage('https://i.imgur.com/example7.png')

                const embed = new EmbedBuilder()
                    .setColor('2d2d31')
                    .setTitle('**<:GSRP:1264351681764655144>  Session Information**')
                    .setDescription('<:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570>\n\n<:GSRP:1264351681764655144> Interested in participating in our immersive & realistic roleplays? This is the place for you! Here at Florida State Roleplay we try to host sessions daily for our players to create an unmatched roleplay experience. Below all the necessary information to participate in our sessions will be provided.\n\n<:Calender:1324878491224772712> **Session Schedule**\n**Weekend**  sessions are normally held around <t:1731171600:t>  - <t:1731178800:t>\n**Weekday** sessions are normally held around <t:1716580800:t> - <t:1716586200:t>\n\n<:Arrow:1174787121916162121> Times listed above are subject to change, dependent on staff and community availability.\n<:Arrow:1174787121916162121> The **Fulton County Sheriff\'s Office** team in-game is **discord** locked, meaning you must be in the discord and verified to join and roleplay on the team.\n<:Arrow:1174787121916162121> If you need in-game assistance please run the `!mod` command in-game.')
                    .setImage('https://i.imgur.com/example8.png')
               
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('session_status')
                            .setLabel(sessionActive ? 'Session Active' : 'Session Offline')
                            .setStyle(sessionActive ? ButtonStyle.Success : ButtonStyle.Danger)
                            .setDisabled(true)
                    );

                const message = await interaction.reply({
                    embeds: [imageembed, embed],
                    components: [row],
                    fetchReply: true
                });

                const updateStatus = setInterval(async () => {
                    const updatedRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('session_status')
                                .setLabel(sessionActive ? 'Session Active' : 'Session Offline')
                                .setStyle(sessionActive ? ButtonStyle.Success : ButtonStyle.Danger)
                                .setDisabled(true)
                        );

                    if (message.editable) {
                        await message.edit({
                            embeds: [imageembed, embed],
                            components: [updatedRow]
                        });
                    }
                }, 5000);

                setTimeout(() => {
                    clearInterval(updateStatus);
                }, 24 * 60 * 60 * 1000);

            } catch (error) {
                console.error('Error executing live subcommand:', error);
                await interaction.reply({ 
                    content: 'There was an error showing the session information.', 
                    ephemeral: true 
                });
            }
        }
    }
};