require("dotenv/config");

const { App } = require("@slack/bolt");
const uniqBy = require("lodash/uniqBy");
const reilly = require("reilly");

const { FEEDBACK_URL, SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET } = process.env;

const app = new App({
  token: SLACK_BOT_TOKEN,
  signingSecret: SLACK_SIGNING_SECRET
});

const checkText = async text => {
  const result = await reilly(text, {
    presets: ["ableism"],
    enable: ["make-*-great-again"]
  });

  return result.messages;
};

const createResultBlock = result => {
  let text = `> ${result.message}.`;

  if (result.note) {
    text += `\n>\n> ${result.note}`;
  }

  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text
    }
  };
};

const excludeBotMessages = ({ message, next }) => {
  if (message.subtype !== "bot_message") {
    next();
  }
};

app.message(excludeBotMessages, async ({ message, context }) => {
  const results = await checkText(message.text);

  if (!results || results.length === 0) {
    return;
  }

  const uniqueResults = uniqBy(results, result => result.message);

  uniqueResults.forEach(result => {
    console.info(
      `!! Found a violation of rule "${result.ruleId}" from "${result.source}":\n` +
        `!!   user: ${message.user}\n` +
        `!!   channel: ${message.channel}`
    );
  });

  const blocks = [
    {
      type: "section",
      text: {
        type: "plain_text",
        text:
          "I noticed some possibly insensitive or inconsiderate writing in " +
          "your message."
      }
    },
    ...uniqueResults.map(createResultBlock),
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "If this advice doesn't apply here, please ignore it. I'm not able " +
          "to understand the context of the messages I read."
      }
    }
  ];

  if (FEEDBACK_URL) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "Do you have some feedback on this bot? Give it here: " + FEEDBACK_URL
      }
    });
  }

  await app.client.chat.postEphemeral({
    token: context.botToken,
    channel: message.channel,
    user: message.user,
    blocks
  });
});

(async () => {
  await app.start(process.env.PORT || 3000);

  console.info(`⚡️ App is online!`);
})().catch(err => {
  console.error(err);
});
