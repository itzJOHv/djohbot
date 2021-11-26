module.exports = {
    name: "update",
    permissionRequired: 5,
    slash: true
};

const { exec } = require("child_process");
const { CommandInteraction } = require("discord.js");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports.run = async (interaction = new CommandInteraction) => {
    exec("git stash push --include-untracked");
    exec("git pull", (error, stdout) => {
        exec("git stash drop");
        if (error) return interaction.reply(`\`\`\`fix\n${error}\n\`\`\``);

        if (stdout.includes("Already up to date.")) {
            interaction.reply("Bot already up to date. No changes since last pull.");
        } else {
            console.log("Pulled from GitHub. Rebooting all shards.\n\n" + stdout);
            interaction.reply({
                content: "Pulled from GitHub. Rebooting all shards.\n\nLogs:\n```\n" + stdout + "\n```",
                fetchReply: true
            }).then(async (i) => {
                i.react("♻️").then(() => interaction.client.shard.broadcastEval(() => process.exit()));
            });
        };
    });
};