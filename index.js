require("dotenv/config");

const { App } = require("@slack/bolt");
const alex = require("alex");
const uniqBy = require("lodash/uniqBy");

const {
  SLACK_BOT_NAME,
  SLACK_BOT_TOKEN,
  SLACK_SIGNING_SECRET,
  SLACK_USER_TOKEN
} = process.env;

const app = new App({
  token: SLACK_BOT_TOKEN,
  signingSecret: SLACK_SIGNING_SECRET
});

const findBotUserId = async cursor => {
  const result = await app.client.users.list({
    token: SLACK_BOT_TOKEN,
    cursor,
    include_locale: false
  });

  const botUser = result.members
    .filter(member => member.is_bot)
    .find(member => member.name === SLACK_BOT_NAME);

  if (botUser) {
    return botUser.id;
  }

  if (result.response_metadata.next_cursor) {
    return findBotUserId(result.response_metadata.next_cursor);
  }
};

const listNewChannelIdsForUser = async (userId, cursor) => {
  const result = await app.client.channels.list({
    token: SLACK_BOT_TOKEN,
    cursor,
    exclude_archived: true
  });

  const channelIds = result.channels
    .filter(channel => channel.members.every(member => member !== userId))
    .map(channel => channel.id);

  if (result.response_metadata.next_cursor) {
    return [
      ...channelIds,
      ...(await listNewChannelIdsForUser(result.response_metadata.next_cursor))
    ];
  }

  return channelIds;
};

const checkText = text => {
  return alex.text(text, {
    allow: ["he-she", "her-him", "host-hostess"],
    noBinary: false,
    profanitySureness: 3
  }).messages;
};

const excludeBotMessages = ({ message, next }) => {
  if (message.subtype !== "bot_message") {
    next();
  }
};

app.message(excludeBotMessages, async ({ message, context }) => {
  const results = checkText(message.text);

  if (!results || results.length === 0) {
    return;
  }

  const uniqueResults = uniqBy(results, result => result.message);

  uniqueResults.forEach(result => {
    console.info(
      `!! Found a violation of alex rule ${result.ruleId}:\n` +
        `!!   user: ${message.user}\n` +
        `!!   channel: ${message.channel}`
    );
  });

  await app.client.chat.postEphemeral({
    token: context.botToken,
    channel: message.channel,
    user: message.user,
    blocks: [
      {
        type: "section",
        text: {
          type: "plain_text",
          text:
            "I noticed some possibly insensitive or inconsiderate writing in " +
            "your message. Consider editing it."
        }
      },
      ...uniqueResults.map(result => ({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `> ${result.message}.`
        }
      }))
    ]
  });
});

app.event("channel_created", async ({ event }) => {
  console.info(`⚡️ Adding @${SLACK_BOT_NAME} to #${event.channel.name}...`);

  await app.client.channels.invite({
    token: SLACK_USER_TOKEN,
    channel: event.channel.id,
    users: botUserId
  });

  console.info(`⚡️ ...Done!`);
});

(async () => {
  await app.start(process.env.PORT || 3000);

  console.info(`⚡️ App is online!`);

  const botUserId = await findBotUserId();

  if (!botUserId) {
    throw new Error(`Unable to find @${SLACK_BOT_NAME}`);
  }

  const channelIds = await listNewChannelIdsForUser(botUserId);

  console.info(`⚡️ Adding @${SLACK_BOT_NAME} to all public channels...`);

  await Promise.all(
    channelIds.map(
      async channel =>
        await app.client.channels.invite({
          token: SLACK_USER_TOKEN,
          channel,
          users: botUserId
        })
    )
  );

  console.info(`⚡️ ...Done!`);
})().catch(err => {
  console.error(err);
});
