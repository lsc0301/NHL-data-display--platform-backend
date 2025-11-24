/**
 * Created by: Shichen Liu
 * Date: 2025-11-24
 * 
 * Send test message to Pub/Sub topic
 * 
 * This script can be used to send test messages to the Pub/Sub topic
 * for testing the service without using gcloud CLI.
 * 
 * Usage:
 *   npx ts-node src/utils/send-test-message.ts [message]
 *   npx ts-node src/utils/send-test-message.ts "test message"
 */

import { pubSubClient, TOPIC_NAME } from "../services/pubsub";
import "../services/firebase"; // Initialize Firebase (for credentials)

async function sendTestMessage(messageText: string = "test"): Promise<void> {
    try {
        console.log(`📤 Sending message to topic: ${TOPIC_NAME}`);
        console.log(`   Message: ${messageText}`);

        const topic = pubSubClient.topic(TOPIC_NAME);
        const messageId = await topic.publishMessage({
            data: Buffer.from(messageText),
        });

        console.log(`✅ Message sent successfully!`);
        console.log(`   Message ID: ${messageId}`);
    } catch (error) {
        console.error(`❌ Failed to send message:`, error);
        process.exit(1);
    }
}

// Get message from command line arguments or use default
const message = process.argv[2] || "test";

// Send the message
sendTestMessage(message).then(() => {
    console.log(`\n✨ Done!`);
    process.exit(0);
});

