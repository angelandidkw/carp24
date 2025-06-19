const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = async (message, client) => {
    // Only handle DMs, not server messages
    if (message.channel.type !== 1) return; // 1 = DM channel
    if (message.author.bot) return;

    // Check if user is already in an application process
    const userApplications = client.userApplications || new Map();
    
    if (userApplications.has(message.author.id)) {
        const userData = userApplications.get(message.author.id);
        
        // Handle application responses
        if (userData.state === 'waiting_for_roblox_username') {
            userData.robloxUsername = message.content;
            userData.state = 'waiting_for_discord_username';
            await sendApplicationQuestion(message, 'discord_username', userData);
        } else if (userData.state === 'waiting_for_discord_username') {
            userData.discordUsername = message.content;
            userData.state = 'waiting_for_discord_id';
            await sendApplicationQuestion(message, 'discord_id', userData);
        } else if (userData.state === 'waiting_for_discord_id') {
            userData.discordId = message.content;
            userData.state = 'waiting_for_roblox_profile';
            await sendApplicationQuestion(message, 'roblox_profile', userData);
        } else if (userData.state === 'waiting_for_roblox_profile') {
            userData.robloxProfile = message.content;
            userData.state = 'waiting_for_experience';
            await sendApplicationQuestion(message, 'experience', userData);
        } else if (userData.state === 'waiting_for_experience') {
            userData.experience = message.content;
            userData.state = 'waiting_for_activity';
            await sendApplicationQuestion(message, 'activity', userData);
        } else if (userData.state === 'waiting_for_activity') {
            userData.activity = message.content;
            userData.state = 'waiting_for_spag';
            await sendApplicationQuestion(message, 'spag', userData);
        } else if (userData.state === 'waiting_for_spag') {
            userData.spag = message.content;
            userData.state = 'waiting_for_about';
            await sendApplicationQuestion(message, 'about', userData);
        } else if (userData.state === 'waiting_for_about') {
            userData.about = message.content;
            userData.state = 'waiting_for_frp';
            await sendApplicationQuestion(message, 'frp', userData);
        } else if (userData.state === 'waiting_for_frp') {
            userData.frp = message.content;
            userData.state = 'waiting_for_fear_rp';
            await sendApplicationQuestion(message, 'fear_rp', userData);
        } else if (userData.state === 'waiting_for_fear_rp') {
            userData.fearRp = message.content;
            userData.state = 'waiting_for_rdm';
            await sendApplicationQuestion(message, 'rdm', userData);
        } else if (userData.state === 'waiting_for_rdm') {
            userData.rdm = message.content;
            userData.state = 'waiting_for_vdm';
            await sendApplicationQuestion(message, 'vdm', userData);
        } else if (userData.state === 'waiting_for_vdm') {
            userData.vdm = message.content;
            userData.state = 'waiting_for_staff_evasion';
            await sendApplicationQuestion(message, 'staff_evasion', userData);
        } else if (userData.state === 'waiting_for_staff_evasion') {
            userData.staffEvasion = message.content;
            userData.state = 'waiting_for_questions';
            await sendApplicationQuestion(message, 'questions', userData);
        } else if (userData.state === 'waiting_for_questions') {
            userData.questions = message.content;
            userData.state = 'completed';
            await sendFinalApplication(message, userData, client);
        }
        
        userApplications.set(message.author.id, userData);
        client.userApplications = userApplications;
        return;
    }

    // Check if message contains application-related keywords
    const applicationKeywords = ['apply', 'application', 'staff', 'staff application', 'moderator', 'admin'];
    const messageContent = message.content.toLowerCase();
    
    if (applicationKeywords.some(keyword => messageContent.includes(keyword))) {
        const embed = new EmbedBuilder()
            .setTitle('🛡️ Staff Application')
            .setDescription('Welcome to the California State Roleplay Staff Application!\n\nThis application will ask you several questions about yourself and your knowledge of roleplay servers.\n\n**Are you sure you want to proceed with the staff application?**\n\nThis process will take approximately 5-10 minutes to complete.')
            .setColor('#5865F2')
            .setFooter({ text: 'California State Roleplay Staff Application' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('start_application')
                    .setLabel('Start Application')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('cancel_application')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );

        await message.reply({ embeds: [embed], components: [row] });
    }
};

async function sendApplicationQuestion(message, questionType, userData) {
    const questions = {
        roblox_username: {
            title: '📝 Roblox Information',
            description: '**What is your Roblox Username?**\n\nPlease provide your exact Roblox username (e.g: jennaisthebestfr)',
            color: '#5865F2'
        },
        discord_username: {
            title: '📝 Discord Information',
            description: '**What is your Discord username?**\n\nPlease provide your Discord username (e.g: humberlyy)',
            color: '#5865F2'
        },
        discord_id: {
            title: '📝 Discord ID',
            description: '**What is your Discord ID?**\n\nPlease provide your Discord ID (e.g: 931293397648564245)\n\n*To get your Discord ID, enable Developer Mode in Discord settings, then right-click your name and select "Copy ID"*',
            color: '#5865F2'
        },
        roblox_profile: {
            title: '📝 Roblox Profile',
            description: '**What is your Roblox Profile Link?**\n\nPlease provide your full Roblox profile link (e.g: www.roblox.com/users/5234461/profile)',
            color: '#5865F2'
        },
        experience: {
            title: '👥 About Yourself',
            description: '**Do you happen to have any past experience in previous servers, or current ones?**\n\nIf so let us know what rank you were/are and how many members it has. (e.g: JM, CSRP, 400+ Members.)\n\nIf you have no experience, please type "None" or "No experience".',
            color: '#FF6B6B'
        },
        activity: {
            title: '👥 About Yourself',
            description: '**How Active can you be on a scale from 1-10?**\n\nPlease provide a number between 1-10 and explain why you chose that number.',
            color: '#FF6B6B'
        },
        spag: {
            title: '👥 About Yourself',
            description: '**How good is your SPaG from 1-10?**\n\nSPaG = Spelling, Punctuation, and Grammar\n\nPlease provide a number between 1-10 and explain why you chose that number.',
            color: '#FF6B6B'
        },
        about: {
            title: '👥 About Yourself',
            description: '**Tell us a few things about you, and why we should accept you over other applicants.**\n\nPlease provide at least 3 sentences explaining your qualifications, personality, and why you would be a good fit for our staff team.',
            color: '#FF6B6B'
        },
        frp: {
            title: '📚 Basic Terminology',
            description: '**What is FRP?**\n\nPlease provide:\n• Example\n• Explanation\n• Abbreviation\n\n(3+ sentences required)',
            color: '#4ECDC4'
        },
        fear_rp: {
            title: '📚 Basic Terminology',
            description: '**What is Fear Roleplay?**\n\nPlease provide:\n• Example\n• Explanation\n\n(2+ sentences required)',
            color: '#4ECDC4'
        },
        rdm: {
            title: '📚 Basic Terminology',
            description: '**What is RDM?**\n\nPlease provide:\n• Example\n• Explanation\n• Abbreviation\n\n(3+ sentences required)',
            color: '#4ECDC4'
        },
        vdm: {
            title: '📚 Basic Terminology',
            description: '**What is VDM?**\n\nPlease provide:\n• Example\n• Explanation\n• Abbreviation\n\n(3+ sentences required)',
            color: '#4ECDC4'
        },
        staff_evasion: {
            title: '📚 Basic Terminology',
            description: '**What is Staff Evasion?**\n\nPlease provide:\n• Example\n• Explanation\n\n(2+ sentences required)',
            color: '#4ECDC4'
        },
        questions: {
            title: '❓ Final Questions',
            description: '**Any questions you want to ask before you go?**\n\nIf you have any questions about the server, staff position, or anything else, please ask them here.\n\nIf you have no questions, please type "None" or "No questions".',
            color: '#FFE66D'
        }
    };

    const question = questions[questionType];
    const embed = new EmbedBuilder()
        .setTitle(question.title)
        .setDescription(question.description)
        .setColor(question.color)
        .setFooter({ text: 'California State Roleplay Staff Application' })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function sendFinalApplication(message, userData, client) {
    const embed = new EmbedBuilder()
        .setTitle('🎉 Application Complete!')
        .setDescription('Thank you for completing your staff application for California State Roleplay!\n\nYour application has been submitted and will be reviewed by our staff team. You will receive a response within 24-48 hours.\n\n**Good luck!** 🍀')
        .setColor('#00FF00')
        .setFooter({ text: 'California State Roleplay Staff Application' })
        .setTimestamp();

    await message.reply({ embeds: [embed] });

    // Send application to staff channel
    await sendApplicationToStaffChannel(userData, client);
}

async function sendApplicationToStaffChannel(userData, client) {
    const staffChannelId = '1383651689579679744'; // Replace with your staff channel ID
    const staffChannel = client.channels.cache.get(staffChannelId);
    
    if (!staffChannel) {
        console.error('Staff channel not found!');
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('🛡️ New Staff Application')
        .setDescription(`**Application submitted by:** ${userData.discordUsername} (${userData.discordId})`)
        .setColor('#5865F2')
        .addFields(
            { name: '📝 Roblox Information', value: `**Username:** ${userData.robloxUsername}\n**Profile:** ${userData.robloxProfile}`, inline: false },
            { name: '👥 About Yourself', value: `**Experience:** ${userData.experience}\n**Activity Level:** ${userData.activity}\n**SPaG Rating:** ${userData.spag}\n**About:** ${userData.about}`, inline: false },
            { name: '📚 Basic Terminology', value: `**FRP:** ${userData.frp}\n**Fear RP:** ${userData.fearRp}\n**RDM:** ${userData.rdm}\n**VDM:** ${userData.vdm}\n**Staff Evasion:** ${userData.staffEvasion}`, inline: false },
            { name: '❓ Questions', value: userData.questions || 'None', inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Staff Application Review' });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`accept_${userData.discordId}`)
                .setLabel('Accept')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId(`deny_${userData.discordId}`)
                .setLabel('Deny')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌'),
            new ButtonBuilder()
                .setCustomId(`question_${userData.discordId}`)
                .setLabel('Ask Question')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('❓'),
            new ButtonBuilder()
                .setCustomId(`block_${userData.discordId}`)
                .setLabel('Block User')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🚫')
        );

    await staffChannel.send({ embeds: [embed], components: [row] });
} 