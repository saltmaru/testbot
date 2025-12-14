
/////////////////
// discord bot //
/////////////////

import discord from "discord.js";

const client = new discord.Client({
  intents: [
    discord.GatewayIntentBits.Guilds,
    discord.GatewayIntentBits.GuildMessages,
    discord.GatewayIntentBits.MessageContent,
  ],
});

const wallets = new Map();

client.on("messageCreate", (message) => {
  if (message.mentions.has(client.user.id, { ignoreEveryone: true })) {
    if (!wallets.has(message.author.id)) wallets.set(message.author.id, 100);
    message.reply(`Your balance: ${wallets.get(message.author.id)}`);
  }
});

client.on("clientReady", async () => {
  console.log("[CLIENT] Ready");
});

client.login(process.env.BOT_TOKEN);

/////////////////////
// cocoa endpoints //
/////////////////////

import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

app.use("*", async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header) {
    return c.json({ status: "err", reason: "missing authorization" }, 401);
  }

  const [kind, token] = header.split(" ");
  if (kind !== "Bearer" || token !== process.env.COCOA_TOKEN) {
    return c.text({ status: "err", reason: "invalid token" }, 401);
  }

  await next();
});

app.post("/", async (c) => {
  const { subject, user_id, quantity } = await c.req.json();

  switch (subject) {
    case "withdraw": {
      if (!wallets.has(user_id)) {
        return c.json({ ok: false, error: "WALLET_NOT_FOUND" }, 200);
      }

      const balance = wallets.get(user_id);
      if (balance < quantity) {
        return c.json({ ok: false, error: "INSUFFICIENT_FUNDS" }, 200);
      }

      wallets.set(user_id, balance - quantity);

      return c.json({ ok: true });
    }
    case "deposit": {
      if (!wallets.has(user_id)) {
        return c.json({ ok: false, error: "WALLET_NOT_FOUND" }, 200);
      }

      const balance = wallets.get(user_id);
      wallets.set(user_id, balance + quantity);

      return c.json({ ok: true });
    }
  }
  return c.text({ ok: false, error: "INVALID_SUBJECT" }, 200);
});

serve({
  fetch: app.fetch,
  port: process.env.PORT,
});