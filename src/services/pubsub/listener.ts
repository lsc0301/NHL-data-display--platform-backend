/**
 * Created by: Shichen Liu
 * Date: 2025-11-21
 * 
 * Message listener setup
 * 
 * This module handles:
 * - Message listener setup
 */

import { Message } from "@google-cloud/pubsub";
import { subscription, SUBSCRIPTION_NAME } from "./subscription";

/**
 * Message handler type
 * Return true/void to ack, throw error or return false to nack
 */
export type MessageHandler = (message: Message) => Promise<void | boolean> | void | boolean;

/**
 * Start listening to Pub/Sub subscription messages
 * 
 * @param messageHandler - Function to handle incoming messages
 * @returns void
 */
export function startListening(messageHandler: MessageHandler): void {
    console.log(`🔔 Starting to listen for messages on subscription: ${SUBSCRIPTION_NAME}`);

    subscription.on("message", async (message: Message) => {
        console.log(`📨 Received message: ${message.id}`);

        try {
            // Call the message handler
            const result = await messageHandler(message);

            // If handler returns false, nack the message (for retry)
            if (result === false) {
                console.log(`⚠️  Message handler returned false, nacking message: ${message.id}`);
                message.nack();
                return;
            }

            // Otherwise, ack the message (success)
            console.log(`✅ Message processed successfully, acking: ${message.id}`);
            message.ack();
        } catch (error) {
            console.error(`❌ Error handling message ${message.id}:`, error);
            // Nack the message to retry (as per requirements)
            message.nack();
        }
    });

    // Handle errors
    subscription.on("error", (error: Error) => {
        console.error("❌ Subscription error:", error);
    });
}

