/**
 * Created by: Shichen Liu
 * Date: 2025-11-21
 * 
 * Configuration module
 * 
 * This module handles:
 * - Loading environment variables from .env file
 * - Providing typed access to all environment variables through class properties
 * 
 * Usage:
 *   import { config } from './config';
 *   const port = config.PORT;
 */

import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
// Path is relative to the project root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Configuration class that provides typed access to environment variables
 */
class Config {
    // Firebase / Google Cloud Configuration
    /**
     * Path to Firebase service account key file
     * If not set, will use the default path in config directory
     */
    readonly GOOGLE_APPLICATION_CREDENTIALS: string | undefined =
        process.env.GOOGLE_APPLICATION_CREDENTIALS;

    // Pub/Sub Configuration
    /**
     * Pub/Sub subscription name (default: nhl-scores-subscriber)
     */
    readonly PUBSUB_SUBSCRIPTION_NAME: string =
        process.env.PUBSUB_SUBSCRIPTION_NAME || "nhl-scores-subscriber";

    /**
     * Pub/Sub topic name (default: nhl-scores-fetch)
     */
    readonly PUBSUB_TOPIC_NAME: string =
        process.env.PUBSUB_TOPIC_NAME || "nhl-scores-fetch";

    // Server Configuration
    /**
     * Server port (default: 3000)
     */
    readonly PORT: number = parseInt(process.env.PORT || "3000", 10);

    // NHL API Configuration
    /**
     * NHL API base URL (default: https://api-web.nhle.com)
     */
    readonly NHL_API_BASE_URL: string =
        process.env.NHL_API_BASE_URL || "https://api-web.nhle.com";

    // Firestore Configuration
    /**
     * Firestore collection name for games (default: games)
     */
    readonly FIRESTORE_GAMES_COLLECTION: string =
        process.env.FIRESTORE_GAMES_COLLECTION || "games";

    /**
     * Number of days to update for schema changes (default: 30)
     */
    readonly DAYS_TO_UPDATE_FOR_SCHEMA: number = parseInt(
        process.env.DAYS_TO_UPDATE_FOR_SCHEMA || "30",
        10
    );

    /**
     * Validate configuration values
     * Throws error if required values are missing
     */
    validate(): void {
        // Add validation logic here if needed
        if (isNaN(this.PORT) || this.PORT < 1 || this.PORT > 65535) {
            throw new Error(`Invalid PORT value: ${this.PORT}. Must be between 1 and 65535.`);
        }

        if (isNaN(this.DAYS_TO_UPDATE_FOR_SCHEMA) || this.DAYS_TO_UPDATE_FOR_SCHEMA < 1) {
            throw new Error(
                `Invalid DAYS_TO_UPDATE_FOR_SCHEMA value: ${this.DAYS_TO_UPDATE_FOR_SCHEMA}. Must be at least 1.`
            );
        }

        if (!this.NHL_API_BASE_URL || !this.NHL_API_BASE_URL.trim()) {
            throw new Error("NHL_API_BASE_URL cannot be empty.");
        }
    }
}

// Export singleton instance of Config
export const config = new Config();

// Validate configuration on module load
config.validate();

