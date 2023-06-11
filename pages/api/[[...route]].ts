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
app.shortcut('buddy_up', async ({ ack, body, client }) => {
    await ack();

    console.log('Buddy Up Shortcut invoked. Trigger ID: ' + body.trigger_id);

    try {
        // Call views.open with the built-in client
        const result = await client.views.open({
            trigger_id: body.trigger_id,
            view: {
                type: 'modal',
                callback_id: 'buddy_up_shortcut_channel_selected',
                title: {
                    type: 'plain_text',
                    text: 'Buddy Up'
                },
                blocks: [
                    {
                        type: 'input',
                        block_id: 'block_1',
                        element: {
                            type: 'conversations_select',
                            action_id: 'action_1',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Select a channel'
                            },
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Channel to look up members to match',
                        },
                    },
                ],
                submit: {
                    type: 'plain_text',
                    text: 'Submit',
                },
            },
        });
    }
    catch (error) {
        console.error(error);
    }
});

// Handle the view_submission event
app.view('buddy_up_shortcut_channel_selected', async ({ ack, body, view, client }) => {
    // Acknowledge the view_submission event
    await ack();

    console.log('Buddy Up Shortcut channel Selected');

    try {
        const selectedChannel = view.state.values.block_1.action_1.selected_conversation;

        // Retrieve the list of members in the channel
        const res = await app.client.conversations.members({ channel: selectedChannel });
        const members = res.members;

        // Retrieve each member's profile and store them in a list
        const profiles = [];
        for (const memberId of members) {
            const profileRes: any = await app.client.users.profile.get({ user: memberId });
            if (!profileRes.profile.bot_id) {
                profiles.push({
                    id: memberId,
                    tzOffset: profileRes.profile.tz_offset,
                    name: profileRes.profile.real_name,
                });
            }
        }


        // Sort the list of profiles by timezone offset
        profiles.sort((a, b) => a.tzOffset - b.tzOffset);

        // Pair up members who are farthest apart in timezone and create the output message
        let outputMessage = '';
        const memberInfoList = [];
        while (profiles.length > 1) {
            const member1 = profiles.shift(); // Get and remove the first member in the list
            const member2 = profiles.pop(); // Get and remove the last member in the list

            outputMessage += `* <@${member1.id}> matched with <@${member2.id}>. <@${member1.id}>, you are in charge of scheduling the 1-1.\n`;
            memberInfoList.push({ name: member1.name, tzOffset: member1.tzOffset });
            memberInfoList.push({ name: member2.name, tzOffset: member2.tzOffset });
        }

        // If there's one member left, they couldn't be paired with anyone
        if (profiles.length === 1) {
            const member = profiles[0];
            outputMessage += `* <@${member.id}> couldn't be paired with anyone.\n`;
            memberInfoList.push({ name: member.name, tzOffset: member.tzOffset });
        }

        // Send message to the channel
        console.log('Sending message to the channel: ' + selectedChannel);

        await app.client.chat.postMessage({
            token: process.env.SLACK_BOT_TOKEN,
            channel: selectedChannel,
            text: outputMessage,
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