import { readdirSync } from "node:fs";
import db from "./database/";
import { inspect } from "util";
import Sharding from "discord-hybrid-sharding";
import Util from "./util/Util";
import { ActivityType, Client, GatewayIntentBits, Options, Partials } from "discord.js";
import prettyms from "pretty-ms";
import tickers from "./handlers/tickers";
import lavaHandler from "./handlers/lava";
import prepareGuild from "./handlers/prepareGuilds";
export const client = new Client({
    makeCache: Options.cacheWithLimits({
        MessageManager: 4096
    }),
    sweepers: {
        messages: {
            interval: 600,
            lifetime: 24 * 60 * 60 // 24 hours
        }
    },
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Channel],
    presence: {
        status: "dnd",
        activities: [{
            type: ActivityType.Watching,
            name: "the loading screen",
        }]
    },
    shards: Sharding.Client.getInfo().SHARD_LIST,
    shardCount: Sharding.Client.getInfo().TOTAL_SHARDS
});
client.database = db;
Util.setClient(client).setDatabase(db);
import { clientLogger } from "./util/logger/normal";

export const cluster = `[Cluster ${client.cluster.id}]`;
export let disabledGuilds: Set<string>;
client.once("ready", async () => {
    let start = Date.now();
    client.loading = true;

    clientLogger.info(`Ready as ${client.user!.tag}!`);

    Util.setLavaManager(lavaHandler(client));

    disabledGuilds = new Set<string>(client.guilds.cache.map((g) => g.id));

    const guildCachingStart = Date.now();
    await db.cacheGSets(disabledGuilds);
    await db.cacheGuilds(disabledGuilds);
    await (await db.global()).reload();
    clientLogger.info(`Cached ${disabledGuilds.size} guilds. [${Date.now() - guildCachingStart}ms]`);

    let processingStartTimestamp = Date.now(), completed = 0, presenceInterval = setInterval(() => client.user!.setPresence({
        status: "dnd",
        activities: [{
            type: ActivityType.Watching,
            name: `${Math.floor((completed / client.guilds.cache.size) * 100)}%`
        }]
    }), 1000);
    await Promise.all(client.guilds.cache.map(async (guild) => {
        await prepareGuild(guild);
        disabledGuilds.delete(guild.id);
        completed++;
    }));
    clearInterval(presenceInterval);
    clientLogger.info(`Processed ${client.guilds.cache.size} guilds. [${Date.now() - processingStartTimestamp}ms]`);

    tickers();

    client.loading = false;
    clientLogger.info(`Ready in ${prettyms(Date.now() - start)}`);
});

const eventFiles = readdirSync(__dirname + "/events/").filter((x) => x.endsWith(".js"));
for (const filename of eventFiles) {
    const file = require(`./events/${filename}`);
    const name = filename.split(".")[0];
    if (file.once) {
        client.once(name, file.run);
    } else {
        client.on(name, file.run);
    };
};

client.on("error", (err) => void clientLogger.error(`Client error. ${inspect(err)}`));
client.rest.on("rateLimited", (rateLimitInfo) => void clientLogger.warn(`Rate limited.\n${JSON.stringify(rateLimitInfo)}`));
client.on("shardDisconnect", ({ code, reason }, id) => void clientLogger.warn(`[Shard ${id}] Disconnected. (${code} - ${reason})`));
client.on("shardReconnecting", (id) => void clientLogger.warn(`[Shard ${id}] Reconnecting.`));
client.on("shardResume", (id, num) => void clientLogger.warn(`[Shard ${id}] Resumed. ${num} replayed events.`));
client.on("shardReady", (id) => void clientLogger.info(`[Shard ${id}] Ready.`));
client.on("warn", (info) => void clientLogger.warn(`Warning. ${inspect(info)}`));

client.on("debug", (info) => {
    if (client.cfg.debug) clientLogger.debug(info);
});

db.connection.then(() => client.login()).catch((e) => {
    clientLogger.error(e);
    client.cluster.send("respawn");
});

process.on("unhandledRejection", (e) => void clientLogger.error("unhandledRejection: " + inspect(e)));
process.on("uncaughtException", (e) => void clientLogger.error("uncaughtException:" + inspect(e)));

clientLogger.info("=".repeat(55));