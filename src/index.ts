/**
 * Created by: Shichen Liu
 * Date: 2025-11-24
 * 
 * NHL Data Display Platform Backend
 * Main entry file
 * 
 * This file is the main entry point for the backend server.
 * It initializes all services and starts listening to Pub/Sub messages.
 */

import { config } from "./config";
import { startListening, type MessageHandler } from "./services/pubsub";
import { nhlApiService } from "./api/nhlApi";
import { processAndStoreGames } from "./utils/gameService";
import "./services/firebase"; // Initialize Firebase Admin SDK

/**
 * Handle incoming Pub/Sub messages
 * When a message is received:
 * 1. Fetch NHL game data for today and the past 7 days
 * 2. Process and store the games in Firestore
 */
const handleMessage: MessageHandler = async (message) => {
    const messageId = message.id;
    const messageData = message.data.toString();

    console.log(`\n📨 [Main] Processing message ${messageId}`);
    console.log(`   Message data: ${messageData || "(empty)"}`);

    try {
        // Step 1: Fetch games for today + past 7 days (total 8 days)
        console.log(`\n📡 [Main] Fetching NHL game data...`);
        const games = await nhlApiService.fetchGamesForDateRange(7);

        if (games.length === 0) {
            console.log(`ℹ️  [Main] No games found for the requested date range`);
            return; // Success - just no games to process
        }

        console.log(`\n✅ [Main] Successfully fetched ${games.length} game(s) from NHL API`);

        // Step 2: Process and store games in Firestore
        console.log(`\n💾 [Main] Processing and storing games...`);
        await processAndStoreGames(games);

        console.log(`\n✅ [Main] Message ${messageId} processed successfully`);
    } catch (error) {
        console.error(`\n❌ [Main] Error processing message ${messageId}:`, error);
        // Throw error to trigger nack (message retry)
        throw error;
    }
};

/**
 * Start the service
 */
function startService(): void {
    console.log('\n🚀 NHL Data Display Platform Backend starting...');
    console.log(`📋 Configuration:`);
    console.log(`   - Port: ${config.PORT}`);
    console.log(`   - Pub/Sub Subscription: ${config.PUBSUB_SUBSCRIPTION_NAME}`);
    console.log(`   - Pub/Sub Topic: ${config.PUBSUB_TOPIC_NAME}`);
    console.log(`   - Firestore Collection: ${config.FIRESTORE_GAMES_COLLECTION}`);
    console.log(`   - NHL API Base URL: ${config.NHL_API_BASE_URL}`);
    console.log(`   - Schema Update Days: ${config.DAYS_TO_UPDATE_FOR_SCHEMA}`);

    // Start listening to Pub/Sub messages
    startListening(handleMessage);

    console.log('\n✅ Service started successfully!');
    console.log('   Waiting for Pub/Sub messages...');
    console.log('   Press Ctrl+C to stop the service\n');
}

/**
 * Graceful shutdown handler
 */
function setupGracefulShutdown(): void {
    const shutdown = (signal: string) => {
        console.log(`\n\n${signal} received. Shutting down gracefully...`);
        console.log('👋 Goodbye!');
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
        console.error('❌ Uncaught Exception:', error);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
        process.exit(1);
    });
}

// Start the service if this file is run directly
if (require.main === module) {
    setupGracefulShutdown();
    startService();
}

