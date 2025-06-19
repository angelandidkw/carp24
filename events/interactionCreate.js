const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    Colors,
    PermissionFlagsBits
} = require('discord.js');

// Ban Appeal System Constants
const TARGET_CHANNEL_ID = '1383651703198449715'; // log channel (using existing log channel)
const STAFF_ROLE_ID = '1383651425581793360'; // staff role that can accept/deny appeals

// Map<userId, { msgId, embedColor }>
const appeals = new Map();

// Logging function
async function logCommand(client, type, commandName, user, guild) {
    const logChannelId = '1383651697246601286';
    const logChannel = client.channels.cache.get(logChannelId);
    
    if (!logChannel) return;
    
    const embed = new EmbedBuilder()
        .setTitle('Command Used')
        .setColor('#5865F2')
        .addFields(
            { name: 'Command Type', value: type, inline: true },
            { name: 'Command', value: commandName, inline: true },
            { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
            { name: 'Server', value: guild.name, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Command Logger' });
    
    try {
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending log message:', error);
    }
}

// Ban Appeal Helper Functions
function showAppealModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('ban_appeal_modal')
        .setTitle('Ban Appeal');

    const makeInput = (id, lbl, style = TextInputStyle.Short, required = true) =>
        new TextInputBuilder()
            .setCustomId(id)
            .setLabel(lbl)
            .setStyle(style)
            .setRequired(required);

    modal.addComponents(
        new ActionRowBuilder().addComponents(makeInput('username', 'Discord Username')),
        new ActionRowBuilder().addComponents(makeInput('roblox_username', 'Roblox Username')),
        new ActionRowBuilder().addComponents(
            makeInput('reason', 'Why should the ban be lifted?', TextInputStyle.Paragraph)),
        new ActionRowBuilder().addComponents(
            makeInput('notes', 'Additional notes (optional)', TextInputStyle.Paragraph, false)),
    );

    return interaction.showModal(modal);
}

async function handleAppealSubmit(interaction) {
    const username = interaction.fields.getTextInputValue('username');
    const robloxUsername = interaction.fields.getTextInputValue('roblox_username');
    const reason = interaction.fields.getTextInputValue('reason');
    const notes = interaction.fields.getTextInputValue('notes');

    const embed = new EmbedBuilder()
        .setColor(Colors.Orange)
        .setAuthor({ name: username, iconURL: interaction.user.displayAvatarURL() })
        .setTitle('Ban Appeal')
        .addFields(
            { name: 'Discord tag', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Roblox username', value: robloxUsername, inline: true },
            { name: 'Reason', value: reason.slice(0, 1024) },
        )
        .setTimestamp();

    if (notes) embed.addFields({ name: 'Notes', value: notes.slice(0, 1024) });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`appeal_accept_${interaction.user.id}`)
            .setLabel('Accept')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`appeal_deny_${interaction.user.id}`)
            .setLabel('Deny')
            .setStyle(ButtonStyle.Danger),
    );

    const channel = await interaction.client.channels.fetch(TARGET_CHANNEL_ID);
    const msg = await channel.send({ embeds: [embed], components: [row] });

    appeals.set(interaction.user.id, { msgId: msg.id, embedColor: Colors.Orange });

    await interaction.reply({ content: 'Your appeal has been submitted.', ephemeral: true });
}

async function showDecisionModal(interaction) {
    // staff gate
    if (
        !interaction.member.roles.cache.has(STAFF_ROLE_ID) &&
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
        return interaction.reply({ content: '🚫 Staff only.', ephemeral: true });
    }

    const [, action, userId] = interaction.customId.split('_'); // [appeal, accept|deny, uid]

    const modal = new ModalBuilder()
        .setCustomId(`appeal_decision_modal_${action}_${userId}`)
        .setTitle(`${action === 'accept' ? 'Accept' : 'Deny'} Appeal`);

    modal.addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('decision_note')
                .setLabel('Optional note to the user')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false),
        ),
    );

    await interaction.showModal(modal);
}

async function handleDecision(interaction) {
    const [, , , action, userId] = interaction.customId.split('_');
    const note = interaction.fields.getTextInputValue('decision_note');
    const targetUser = await interaction.client.users.fetch(userId).catch(() => null);

    /* 1. Update staff log */
    const appeal = appeals.get(userId);
    if (appeal) {
        try {
            const channel = await interaction.client.channels.fetch(TARGET_CHANNEL_ID);
            const oldMsg = await channel.messages.fetch(appeal.msgId);

            const decisionEmbed = EmbedBuilder.from(oldMsg.embeds[0])
                .setColor(action === 'accept' ? Colors.Green : Colors.Red)
                .addFields({ name: 'Decision', value: `**${action.toUpperCase()}** by ${interaction.user}` })
                .setTimestamp();

            if (note) decisionEmbed.addFields({ name: 'Note', value: note.slice(0, 1024) });

            await oldMsg.edit({ embeds: [decisionEmbed], components: [] });
        } catch (err) {
            console.error('🔴 Could not update log message:', err);
        } finally {
            appeals.delete(userId);
        }
    }

    /* 2. DM the user */
    if (targetUser) {
        const dmEmbed = new EmbedBuilder()
            .setColor(action === 'accept' ? Colors.Green : Colors.Red)
            .setTitle(`Ban Appeal ${action === 'accept' ? 'Accepted' : 'Denied'}`)
            .setDescription(
                action === 'accept'
                    ? 'Good news! Your ban has been lifted.'
                    : 'Unfortunately, your appeal was denied.',
            )
            .setTimestamp();

        if (note) dmEmbed.addFields({ name: 'Staff note', value: note.slice(0, 1024) });

        await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});
    }

    /* 3. Acknowledge the staff interaction */
    await interaction.reply({
        content: `Decision recorded – the user has been ${action === 'accept' ? 'unbanned' : 'kept banned'}.`,
        ephemeral: true,
    });
}

module.exports = async (interaction, client) => {
    try {
        // Ban Appeal System Handlers
        if (interaction.isButton() && interaction.customId === 'ban_appeal') {
            return showAppealModal(interaction);
        }

        if (interaction.isModalSubmit() && interaction.customId === 'ban_appeal_modal') {
            return handleAppealSubmit(interaction);
        }

        if (interaction.isButton() && /^appeal_(accept|deny)_\d+$/.test(interaction.customId)) {
            return showDecisionModal(interaction);
        }

        if (
            interaction.isModalSubmit() &&
            /^appeal_decision_modal_(accept|deny)_\d+$/.test(interaction.customId)
        ) {
            return handleDecision(interaction);
        }

        // Handle select menu for ticket system
        if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_support_type') {
            const supportType = interaction.values[0];
            let supportLabel = '';
            let categoryId = '';
            let rolePermissions = [];

            // Set category ID and role permissions based on support type
            if (supportType === 'general') {
                supportLabel = 'General';
                categoryId = '1383934797922963688';
                rolePermissions = [
                    '1383651424516182026',
                    '1383651410725572719',
                    '1383651402135507054'
                ];
            } else if (supportType === 'internal_affairs') {
                supportLabel = 'Internal Affairs';
                categoryId = '1383921949364850789';
                rolePermissions = [
                    '1383651424516182026',
                    '1383651410725572719',
                    '1383651402135507054'
                ];
            } else if (supportType === 'management') {
                supportLabel = 'Management';
                categoryId = '1383925769469825145';
                rolePermissions = [
                    '1383651410725572719',
                    '1383651402135507054'
                ];
            }

            const guild = interaction.guild;
            const user = interaction.user;
            const channelName = `ticket-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

            // Check if a ticket already exists for this user
            const existing = guild.channels.cache.find(c => c.parentId === categoryId && c.name === channelName);
            if (existing) {
                await interaction.reply({
                    content: `You already have an open ticket: <#${existing.id}>`,
                    ephemeral: true
                });
                return;
            }

            // Create permission overwrites array
            const permissionOverwrites = [
                {
                    id: guild.roles.everyone,
                    deny: ['ViewChannel']
                },
                {
                    id: user.id,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                }
            ];

            // Add role permissions
            rolePermissions.forEach(roleId => {
                permissionOverwrites.push({
                    id: roleId,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                });
            });

            // Create the channel
            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: 0, // 0 = GUILD_TEXT
                parent: categoryId,
                permissionOverwrites: permissionOverwrites
            });

            // Add buttons for claim and close
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_claim')
                    .setLabel('Claim Ticket')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

            // Create role mentions string
            const roleMentions = rolePermissions.map(roleId => `<@&${roleId}>`).join(' ');

            await ticketChannel.send({
                content: `Hello ${user}, your **${supportLabel}** support ticket has been created. Please describe your issue in detail.\n${roleMentions}`,
                components: [row]
            });
            await interaction.reply({
                content: `Your ticket has been created: <#${ticketChannel.id}>`,
                ephemeral: true
            });
            return;
        }

        // Handle ticket claim and close buttons
        if (interaction.isButton()) {
            if (interaction.customId === 'ticket_claim') {
                // Disable the claim button and show who claimed
                const row = ActionRowBuilder.from(interaction.message.components[0]);
                row.components[0].setDisabled(true).setLabel(`Claimed by ${interaction.user.tag}`);
                await interaction.update({ components: [row] });
                await interaction.channel.send(`${interaction.user} has claimed this ticket.`);
                return;
            }
            if (interaction.customId === 'ticket_close') {
                await interaction.reply({ content: 'This ticket will be closed in 3 seconds...', ephemeral: true });
                setTimeout(() => {
                    interaction.channel.delete().catch(() => {});
                }, 3000);
                return;
            }
        }

        // Staff Application Button Handlers
        if (interaction.isButton()) {
            // Start application button
            if (interaction.customId === 'start_application') {
                const userApplications = client.userApplications || new Map();
                
                // Initialize user data
                const userData = {
                    state: 'waiting_for_roblox_username',
                    discordId: interaction.user.id,
                    discordUsername: interaction.user.tag
                };
                
                userApplications.set(interaction.user.id, userData);
                client.userApplications = userApplications;
                
                // Send first question
                const embed = new EmbedBuilder()
                    .setTitle('📝 Roblox Information')
                    .setDescription('**What is your Roblox Username?**\n\nPlease provide your exact Roblox username (e.g: jennaisthebestfr)')
                    .setColor('#5865F2')
                    .setFooter({ text: 'California State Roleplay Staff Application' })
                    .setTimestamp();
                
                await interaction.update({ embeds: [embed], components: [] });
                return;
            }
            
            // Cancel application button
            if (interaction.customId === 'cancel_application') {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Application Cancelled')
                    .setDescription('Your staff application has been cancelled. You can start a new application anytime by messaging the bot again.')
                    .setColor('#FF0000')
                    .setFooter({ text: 'California State Roleplay Staff Application' })
                    .setTimestamp();
                
                await interaction.update({ embeds: [embed], components: [] });
                return;
            }
            
            // Staff review buttons (accept, deny, ask question, block)
            if (interaction.customId.startsWith('accept_') || 
                interaction.customId.startsWith('deny_') || 
                interaction.customId.startsWith('question_') || 
                interaction.customId.startsWith('block_')) {
                
                // Check if user has staff permissions
                const staffRoleId = '1383651425581793360'; // Replace with your staff role ID
                if (!interaction.member.roles.cache.has(staffRoleId) && 
                    !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ content: '🚫 You do not have permission to review applications.', ephemeral: true });
                }
                
                const [, action, userId] = interaction.customId.split('_');
                const targetUser = await client.users.fetch(userId).catch(() => null);
                
                if (action === 'accept') {
                    // Send acceptance message to user
                    if (targetUser) {
                        const acceptEmbed = new EmbedBuilder()
                            .setTitle('🎉 Application Accepted!')
                            .setDescription('Congratulations! Your staff application for California State Roleplay has been **ACCEPTED**!\n\nA staff member will contact you soon with further instructions and your role assignment.\n\nWelcome to the team! 🛡️')
                            .setColor('#00FF00')
                            .setFooter({ text: 'California State Roleplay Staff Application' })
                            .setTimestamp();
                        
                        await targetUser.send({ embeds: [acceptEmbed] }).catch(() => {});
                    }
                    
                    // Update the application message
                    const embed = EmbedBuilder.from(interaction.message.embeds[0])
                        .setColor('#00FF00')
                        .addFields({ name: 'Decision', value: `**ACCEPTED** by ${interaction.user}`, inline: true })
                        .setTimestamp();
                    
                    await interaction.message.edit({ embeds: [embed], components: [] });
                    await interaction.reply({ content: 'Application accepted! User has been notified.', ephemeral: true });
                    
                } else if (action === 'deny') {
                    // Send denial message to user
                    if (targetUser) {
                        const denyEmbed = new EmbedBuilder()
                            .setTitle('❌ Application Denied')
                            .setDescription('Thank you for your interest in joining the California State Roleplay staff team.\n\nUnfortunately, your application has been **DENIED** at this time.\n\nYou may reapply in 30 days if you wish to try again.\n\nGood luck in your future endeavors!')
                            .setColor('#FF0000')
                            .setFooter({ text: 'California State Roleplay Staff Application' })
                            .setTimestamp();
                        
                        await targetUser.send({ embeds: [denyEmbed] }).catch(() => {});
                    }
                    
                    // Update the application message
                    const embed = EmbedBuilder.from(interaction.message.embeds[0])
                        .setColor('#FF0000')
                        .addFields({ name: 'Decision', value: `**DENIED** by ${interaction.user}`, inline: true })
                        .setTimestamp();
                    
                    await interaction.message.edit({ embeds: [embed], components: [] });
                    await interaction.reply({ content: 'Application denied! User has been notified.', ephemeral: true });
                    
                } else if (action === 'question') {
                    // Show modal to ask a question
                    const modal = new ModalBuilder()
                        .setCustomId(`staff_question_modal_${userId}`)
                        .setTitle('Ask Question to Applicant');
                    
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('question_text')
                                .setLabel('Your question for the applicant')
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(true)
                                .setMaxLength(1000)
                        )
                    );
                    
                    await interaction.showModal(modal);
                    return;
                    
                } else if (action === 'block') {
                    // Block the user (this would require additional implementation)
                    await interaction.reply({ content: 'User blocking functionality would need to be implemented separately.', ephemeral: true });
                    return;
                }
            }
        }
        
        // Handle staff question modal
        if (interaction.isModalSubmit() && interaction.customId.startsWith('staff_question_modal_')) {
            const [, , , userId] = interaction.customId.split('_');
            const questionText = interaction.fields.getTextInputValue('question_text');
            const targetUser = await client.users.fetch(userId).catch(() => null);
            
            if (targetUser) {
                const questionEmbed = new EmbedBuilder()
                    .setTitle('❓ Staff Question')
                    .setDescription(`A staff member has a question about your application:\n\n**${questionText}**\n\nPlease respond to this message with your answer.`)
                    .setColor('#FFE66D')
                    .setFooter({ text: 'California State Roleplay Staff Application' })
                    .setTimestamp();
                
                await targetUser.send({ embeds: [questionEmbed] }).catch(() => {});
            }
            
            await interaction.reply({ content: 'Question sent to the applicant!', ephemeral: true });
            return;
        }

        // Existing slash command handler
        if (!interaction.isChatInputCommand()) return;
        const command = client.slashCommands.get(interaction.commandName);
        if (!command) return;
        
        // Log the slash command
        logCommand(client, 'Slash Command', `/${interaction.commandName}`, interaction.user, interaction.guild);
        
        await command.execute(interaction);
    } catch (error) {
        console.error('❌ Interaction handler error:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: 'An error occurred while processing that interaction.',
                ephemeral: true,
            }).catch(() => {});
        }
    }
}; 