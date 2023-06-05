import { App } from '@slack/bolt';
import { NextApiRequest, NextApiResponse } from 'next';
import NextConnectReceiver from '../../utils/NextConnectReceiver';

const receiver = new NextConnectReceiver({
    signingSecret: process.env.SLACK_SIGNING_SECRET || 'invalid',
    // The `processBeforeResponse` option is required for all FaaS environments.
    // It allows Bolt methods (e.g. `app.message`) to handle a Slack request
    // before the Bolt framework responds to the request (e.g. `ack()`). This is
    // important because FaaS immediately terminate handlers after the response.
    processBeforeResponse: true,
});

// Initializes your app with your bot token and the AWS Lambda ready receiver
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    receiver: receiver,
    developerMode: false,
});

// Listen for the shortcut invocation event
app.shortcut('buddy_up', async ({ ack, body, context }) => {
    await ack();

    console.log('Buddy Up Shortcut invoked');

    try {
        // Retrieve the user ID who invoked the shortcut
        const userId = body.user.id;

        // Send a message to the user
        await app.client.chat.postMessage({
            token: context.botToken,
            channel: userId,
            text: 'Hello! You invoked the Buddy Up shortcut.',
        });
    } catch (error) {
        console.error(error);
    }
});

// this is run just in case
const router = receiver.start();

router.get('/api', (req: NextApiRequest, res: NextApiResponse) => {
    res.status(200).json({
        test: true,
    });
})

export default router;