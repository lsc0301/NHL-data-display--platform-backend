/**
 * Created by: Shichen Liu
 * Date: 2025-11-21
 * 
 * Firebase Admin SDK initialization
 * 
 * This module handles:
 * - Firebase Admin SDK initialization using service account key file
 * 
 * Credentials are loaded from:
 * - Config directory: config/nhl-data-display-platform-firebase-adminsdk-*.json
 * - Or via GOOGLE_APPLICATION_CREDENTIALS environment variable (for deployment)
 */

import admin from "firebase-admin";
import path from "path";
import { existsSync } from "fs";
import { config } from "../config";

// Check if Firebase Admin has already been initialized
// This prevents multiple initializations which would throw an error
if (!admin.apps.length) {
    try {
        // Determine service account key file path
        // Priority: 1. Environment variable, 2. Local config file
        const serviceAccountPath =
            config.GOOGLE_APPLICATION_CREDENTIALS ||
            path.join(__dirname, "../../config/nhl-data-display-platform-firebase-adminsdk-fbsvc-83e5772d7a.json");

        // Check if the service account file exists
        if (!existsSync(serviceAccountPath)) {
            throw new Error(
                `Service account key file not found at: ${serviceAccountPath}\n` +
                "Please ensure the file exists or set GOOGLE_APPLICATION_CREDENTIALS environment variable."
            );
        }

        // Initialize Firebase Admin SDK with service account key file
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccountPath),
        });

        console.log(`✅ Firebase Admin SDK initialized successfully`);
        console.log(`   Using credentials from: ${serviceAccountPath}`);
    } catch (error) {
        console.error("❌ Failed to initialize Firebase Admin SDK:", error);
        throw error;
    }
} else {
    console.log("ℹ️  Firebase Admin SDK already initialized");
}

// Export admin instance for use in other modules
export { admin };

