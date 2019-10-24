require("dotenv/config");

const { App } = require("@slack/bolt");
const alex = require("alex");
const uniqBy = require("lodash/uniqBy");

const { SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET } = process.env;

const app = new App({
  token: SLACK_BOT_TOKEN,
  signingSecret: SLACK_SIGNING_SECRET
});

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

(async () => {
  await app.start(process.env.PORT || 3000);

  console.info(`⚡️ App is online!`);
})().catch(err => {
  console.error(err);
});
