"use strict";var __importDefault=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};const config_1=__importDefault(require("../../../config")),discord_oauth2_1=__importDefault(require("discord-oauth2")),sharding_1=require("../../sharding"),discord_js_1=require("discord.js"),wh=new discord_js_1.WebhookClient({url:config_1.default.notifications_webhook}),oauth2=new discord_oauth2_1.default({clientId:config_1.default.client.id,clientSecret:config_1.default.client.secret,redirectUri:config_1.default.redirectUri});module.exports=(e,s,t)=>{e.get("/shards",(async(e,s)=>{const t=await sharding_1.manager.broadcastEval((e=>({status:e.ws.status,guilds:e.guilds.cache.size,channels:e.channels.cache.size,cachedUsers:e.users.cache.size,users:e.guilds.cache.reduce(((e,s)=>e+s.memberCount),0),ping:e.ws.ping,loading:e.loading}))).then((e=>e.reduce(((e,s,t)=>{for(const[t,i]of Object.entries(s))["guilds","cachedUsers","users"].includes(t)&&(e[t]=(e[t]||0)+i);return e.shards[t]=s,e}),{shards:{},lastUpdate:0})));t.lastUpdate=Date.now(),s.send(t)})),e.get("/login",((e,s)=>{s.redirect(oauth2.generateAuthUrl({scope:["identify","guilds"],responseType:"code"}))})),e.get("/logout",((e,s)=>{e.session.user=null,s.redirect(e.session.lastPage)})),e.get("/authorize",(async(e,s)=>{const t=await oauth2.tokenRequest({code:e.query.code,scope:["identify","guilds"],grantType:"authorization_code"}).catch((()=>s.redirect(e.session.lastPage)));if(!t.access_token)return s.redirect("/api/login");const i=await oauth2.getUser(t.access_token);e.session.user=i,e.session.user.guilds=await oauth2.getUserGuilds(t.access_token),s.redirect(e.session.lastPage)})),e.get("/user/guilds",((e,s)=>{const t=e.session.user;if(!t)return s.redirect("/api/login");const i=[];t.guilds.map((e=>{i.push({id:e.id,name:e.name,iconUrl:e.icon?`https://cdn.discordapp.com/icons/${e.id}/${e.icon}.png`:null,managed:(new discord_js_1.Permissions).add(e.permissions).has("ADMINISTRATOR")})})),s.send(i)})),e.get("/bot/isinuguild/:guild",(async(e,s)=>{const t=e.params.guild;if(!t)return s.send({isinuguild:!1});const i=await sharding_1.manager.broadcastEval(((e,{guildid:s})=>e.guilds.cache.get(s)||null),{shard:discord_js_1.ShardClientUtil.shardIdForGuildId(t,sharding_1.manager.shards.size),context:{guildid:t}});s.send({isinuguild:!!i})})),e.get("/invite/:guildid",((e,s)=>{const t=e.params.guildid,i=config_1.default.client.id;t?s.redirect(["https://discord.com/oauth2/authorize",`?client_id=${i}`,`&guild_id=${t}`,"&disable_guild_select=true","&scope=bot%20applications.commands","&permissions=1375450033182"].join("")):s.redirect(["https://discord.com/oauth2/authorize",`?client_id=${i}`,"&scope=bot%20applications.commands","&permissions=1375450033182"].join(""))})),e.post("/webhook/boticord",(async(e,s)=>{if(console.log(e.headers["X-Hook-Key"]),e.headers["X-Hook-Key"]!==config_1.default.monitoring.bc_hook_key)return s.status(403).send();const t=JSON.parse(e.body);switch(console.log(t),t.type){case"new_bot_bump":await wh.send({content:[`<@${t.data.user}>, спасибо за ап на \`boticord.top\`!`,`Вы можете сделать повторный ап <t:${Math.round(t.data.at/1e3)+14400}:R>.`].join("\n"),username:"Апы"});case"new_bot_comment":await wh.send({embeds:[{title:"Новый комментарий к боту",description:[`<@${t.data.user}> оставил комментарий к боту:`,t.data.comment.new].join("\n"),timestamp:t.data.at,fields:[{name:"Оценка",value:t.data.comment.vote.new?-1===t.data.comment.vote.new?"Негативная":"Позитивная":"Нейтральная"}]}],username:"Комментарии"});case"edit_bot_comment":await wh.send({embeds:[{title:"Новый комментарий к боту",description:[`<@${t.data.user}> изменил комментарий к боту:`,t.data.comment.new].join("\n"),timestamp:t.data.at,fields:[{name:"Оценка",value:t.data.comment.vote.new?-1===t.data.comment.vote.new?"Негативная":"Позитивная":"Нейтральная"}]}],username:"Комментарии"})}})),t()};