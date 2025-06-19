const WELCOME_CHANNEL_ID = '1383651633488990233'; // Replace with your channel ID
const WELCOME_GUILD_NAME = 'California State Roleplay';
const AUTO_ROLE_ID = '1383651459413053471'; // Role to assign to new members

module.exports = async (member) => {
    console.log(`New member joined: ${member.user.tag} (${member.user.id})`);
    
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) {
        console.error(`Welcome channel with ID ${WELCOME_CHANNEL_ID} not found!`);
        return;
    }
    
    const memberCount = member.guild.memberCount;
    
    // Assign the auto role to the new member
    try {
        const role = member.guild.roles.cache.get(AUTO_ROLE_ID);
        if (!role) {
            console.error(`Auto role with ID ${AUTO_ROLE_ID} not found!`);
        } else {
            await member.roles.add(AUTO_ROLE_ID);
            console.log(`✅ Assigned auto role "${role.name}" to ${member.user.tag}`);
        }
    } catch (error) {
        console.error(`❌ Failed to assign auto role to ${member.user.tag}:`, error);
    }
    
    // Send welcome message
    try {
        await channel.send(`Welcome to ${WELCOME_GUILD_NAME} ${member}, we hope you enjoy your stay here! We now have \`${memberCount}\` members.`);
        console.log(`✅ Sent welcome message for ${member.user.tag}`);
    } catch (error) {
        console.error(`❌ Failed to send welcome message for ${member.user.tag}:`, error);
    }
}; 