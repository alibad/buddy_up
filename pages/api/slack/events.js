import { App, LogLevel } from "@slack/bolt";

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    logLevel: LogLevel.DEBUG,
});

// Listen for the shortcut invocation event
app.shortcut('buddy_up', async ({ ack, body, respond }) => {
    // Acknowledge the shortcut event
    await ack();

    console.log('Buddy Up Shortcut invoked');

    // Respond to the event
    try {
        // Respond back with a message to the user
        await client.chat.postMessage({
            channel: payload.user.id,
            text: 'Hello! You invoked the Buddy Up shortcut.'
        });
    } catch (error) {
        console.error(error);
    }
});

// In Slack's Bolt framework, app.error is a global error handler 
// that catches all exceptions thrown in your app. 
app.error(({ error }) => {
    console.error(error);
});

// Request handler for incoming HTTP requests
export default async function events(req, res) {
    console.log('HTTP Verb:', req.method);
    console.log('body:', req.body);

    if (typeof req.body.payload === 'string') {
        req.body = JSON.parse(req.body.payload);
    }

    const type = req.body.type;
    console.log('type:', type);

    if (type === 'url_verification') {
        const { challenge } = req.body;

        if (challenge) {
            // Handle the verification challenge
            res.setHeader("Content-Type", "text/plain");
            res.status(200).send(challenge);
        }
    } else {
        // Process the event
        await app.processEvent(req, res);
    }
}
