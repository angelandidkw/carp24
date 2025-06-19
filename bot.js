require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType, EmbedBuilder, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,  // Required for guildMemberAdd events
        GatewayIntentBits.DirectMessages  // Required for DM handling
    ],
    partials: [
        Partials.Channel,
        Partials.Message
    ]
});

client.prefixCommands = new Collection();
client.slashCommands = new Collection();

// Load prefix commands
defaultPrefix = '!';
const prefixCommandsPath = path.join(__dirname, 'commands/prefixcommands');
const prefixCommandFiles = fs.readdirSync(prefixCommandsPath).filter(file => file.endsWith('.js'));
for (const file of prefixCommandFiles) {
    const command = require(`./commands/prefixcommands/${file}`);
    client.prefixCommands.set(command.name, command);
}

// Load slash commands
const slashCommandsPath = path.join(__dirname, 'commands/slashcommands');
const slashCommandFiles = fs.readdirSync(slashCommandsPath).filter(file => file.endsWith('.js'));
for (const file of slashCommandFiles) {
    const command = require(`./commands/slashcommands/${file}`);
    client.slashCommands.set(command.data.name, command);
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    // Set custom status
    client.user.setPresence({
        activities: [
            {
                name: 'Watching over California State Roleplay',
                type: ActivityType.Custom, // Custom status
            }
        ],
        status: 'online', // online, idle, dnd, invisible
    });
});

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

client.on('messageCreate', (message) => {
    if (message.author.bot) return;
    
    // Handle DMs first
    if (message.channel.type === 1) { // DM channel
        const dmCreateHandler = require('./events/dmCreate');
        return dmCreateHandler(message, client);
    }
    
    // Handle prefix commands in servers
    if (!message.content.startsWith(defaultPrefix)) return;
    const args = message.content.slice(defaultPrefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.prefixCommands.get(commandName);
    if (!command) return;
    
    // Log the command
    logCommand(client, 'Prefix Command', `${defaultPrefix}${commandName}`, message.author, message.guild);
    
    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply('There was an error executing that command!');
    }
});

const interactionCreateHandler = require('./events/interactionCreate');
client.on('interactionCreate', (interaction) => interactionCreateHandler(interaction, client));

// Load and use the event handler from events/guildMemberAdd.js
const guildMemberAddHandler = require('./events/guildMemberAdd');
client.on('guildMemberAdd', guildMemberAddHandler);

client.login(process.env.BOT_TOKEN); 