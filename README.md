# Alex Slack Bot

A Slack bot for running [Alex](https://alexjs.com/) on your team's
conversations.

> Catch insensitive, inconsiderate writing

## Installation

1. Create a [new Slack App](https://api.slack.com/apps?new_app=1) for your
   workspace.

1. _(optional)_ Set an icon and description in _Basic Information_ > _Display
   Information_.

1. Create a bot user via _Bot Users_.

   Turn _Always Show My Bot as Online_ on.

1. Install the app to your workspace via _Install App_.

1. Deploy this app code somewhere. You will need the environment variables
   documented in [`.env.example`](.env.example).

   - `SLACK_BOT_TOKEN` is the _Bot User OAuth Access Token_ from _OAuth &
     Permissions_ > _OAuth Tokens & Redirect URLs_.
   - `SLACK_SIGNING_SECRET` is the _Signing Secret_ from _Basic Information_ >
     _App Credentials_.

1. Enable events via _Event Subscriptions_ and insert the request URL your
   deployed app will have, followed by `/slack/events`. For example, if you're
   using Heroku, your request URL would be
   `https://app-name.herokuapp.com/slack/events`. Add the following to
   _Subscribe to bot events_:

   - `message.im`
   - `message.groups`
   - `message.channels`
   - `message.mpim`

## Usage

Once the app is set up and running, add the bot to the channels you want it to
monitor. Invite it like you would any other user.

As messages are sent in channels the bot user is a member of, the app will pass
them through Alex. If it detects any issues, it will send an ephemeral message
(a message only seen by a single user that disappears after they restart Slack)
to the author of the message in the same channel.
