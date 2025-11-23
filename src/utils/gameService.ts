/**
 * Created by: Shichen Liu
 * Date: 2025-11-23
 * 
 * Game data processing service
 * 
 * This module handles:
 * - Transform API data to Firestore format
 * - Idempotent storage (prevent duplicate entries)
 * - Firestore storage logic
 * - Schema adaptation (automatically store new fields and update recent games)
 */

import { db } from "../services/firestore";
import { Game } from "../api/nhlApi";
import { config } from "../config";

// Configuration constants
const GAMES_COLLECTION = config.FIRESTORE_GAMES_COLLECTION;
const DAYS_TO_UPDATE_FOR_SCHEMA = config.DAYS_TO_UPDATE_FOR_SCHEMA;

/**
 * Firestore game document format
 */
export interface FirestoreGameDocument {
    gameId: number;
    startTime: string;
    homeTeam: {
        id: number;
        name: string;
        score?: number | null;
        [key: string]: any; // Allow for additional fields from API (schema adaptation)
    };
    awayTeam: {
        id: number;
        name: string;
        score?: number | null;
        [key: string]: any; // Allow for additional fields from API (schema adaptation)
    };
    status: string; // "scheduled", "live", "final"
    [key: string]: any; // Allow for additional fields from API (schema adaptation)
}

/**
 * Map gameState to status string
 */
function mapGameStateToStatus(gameState: string): string {
    switch (gameState) {
        case "FUT":
            return "scheduled";
        case "LIVE":
            return "live";
        case "OFF":
            return "final";
        default:
            return gameState.toLowerCase();
    }
}

/**
 * Transform API game data to Firestore document format
 * @param game - Game object from NHL API
 * @returns Firestore document data
 */
function transformGameToFirestore(game: Game): FirestoreGameDocument {
    const firestoreDoc: FirestoreGameDocument = {
        gameId: game.id,
        startTime: game.startTimeUTC,
        homeTeam: {
            id: game.homeTeam.id,
            name: game.homeTeam.commonName.default,
            score: game.homeTeam.score ?? null, // Use null if score is undefined
        },
        awayTeam: {
            id: game.awayTeam.id,
            name: game.awayTeam.commonName.default,
            score: game.awayTeam.score ?? null, // Use null if score is undefined
        },
        status: mapGameStateToStatus(game.gameState),
    };

    // Include all additional fields from API for schema adaptation
    // Copy all fields except the ones we've already mapped
    const excludedFields = ["id", "startTimeUTC", "gameState", "homeTeam", "awayTeam"];
    for (const [key, value] of Object.entries(game)) {
        if (!excludedFields.includes(key)) {
            firestoreDoc[key] = value;
        }
    }

    // Copy additional fields from teams (except id, commonName, score)
    if (game.homeTeam) {
        const homeTeamExcluded = ["id", "commonName", "score"];
        for (const [key, value] of Object.entries(game.homeTeam)) {
            if (!homeTeamExcluded.includes(key)) {
                firestoreDoc.homeTeam[key] = value;
            }
        }
    }

    if (game.awayTeam) {
        const awayTeamExcluded = ["id", "commonName", "score"];
        for (const [key, value] of Object.entries(game.awayTeam)) {
            if (!awayTeamExcluded.includes(key)) {
                firestoreDoc.awayTeam[key] = value;
            }
        }
    }

    return firestoreDoc;
}

/**
 * Store a single game to Firestore (idempotent)
 * @param game - Game object from NHL API
 * @returns Promise<void>
 */
async function storeGame(game: Game): Promise<void> {
    const gameDoc = transformGameToFirestore(game);
    const gameRef = db.collection(GAMES_COLLECTION).doc(String(game.id));

    try {
        // Check if document already exists (idempotent check)
        const docSnapshot = await gameRef.get();

        if (docSnapshot.exists) {
            // Document exists - update with new data (preserve all fields for schema adaptation)
            const existingData = docSnapshot.data() || {};

            // Deep merge: preserve all existing fields, update only changed fields
            // This ensures schema adaptation while only updating what's different
            const updateData: Record<string, any> = {};

            // Check top-level fields
            for (const [key, newValue] of Object.entries(gameDoc)) {
                const existingValue = existingData[key];

                // For nested objects (homeTeam, awayTeam), do deep comparison
                if (
                    key === "homeTeam" ||
                    key === "awayTeam"
                ) {
                    if (
                        JSON.stringify(existingValue) !== JSON.stringify(newValue)
                    ) {
                        // Deep merge for nested objects to preserve any manually added fields
                        updateData[key] = {
                            ...(existingValue || {}),
                            ...newValue,
                        };
                    }
                    // If values are the same, skip this field
                } else if (existingValue !== newValue) {
                    // For primitive values, only update if changed
                    updateData[key] = newValue;
                }
                // If values are the same, skip this field
            }

            // Note: Firestore's update() method automatically preserves fields not in updateData
            // So any manually added fields in existingData will be preserved automatically

            // Only update if there are actual changes
            if (Object.keys(updateData).length > 0) {
                await gameRef.update(updateData);
                console.log(
                    `📝 [Game Service] Updated game ${game.id} in Firestore (${Object.keys(updateData).length} field(s) changed)`
                );
            } else {
                console.log(`ℹ️  [Game Service] Game ${game.id} is already up to date, no changes detected`);
            }
        } else {
            // Document doesn't exist - create new
            await gameRef.set(gameDoc);
            console.log(`✨ [Game Service] Created new game ${game.id} in Firestore`);
        }
    } catch (error) {
        console.error(`❌ [Game Service] Failed to store game ${game.id}:`, error);
        throw new Error(`Failed to store game ${game.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Store multiple games to Firestore
 * @param games - Array of game objects from NHL API
 * @returns Promise<void>
 */
async function storeGames(games: Game[]): Promise<void> {
    if (games.length === 0) {
        console.log("ℹ️  [Game Service] No games to store");
        return;
    }

    console.log(`📦 [Game Service] Storing ${games.length} game(s) to Firestore...`);

    const storePromises = games.map((game) => storeGame(game));
    const results = await Promise.allSettled(storePromises);

    let successCount = 0;
    let failureCount = 0;

    results.forEach((result, index) => {
        if (result.status === "fulfilled") {
            successCount++;
        } else {
            failureCount++;
            console.error(
                `❌ [Game Service] Failed to store game ${games[index].id}:`,
                result.reason
            );
        }
    });

    console.log(
        `📊 [Game Service] Storage completed: ${successCount}/${games.length} games stored successfully (${failureCount} failed)`
    );
}

/**
 * Get date threshold for recent games (N days ago)
 */
function getRecentGamesDateThreshold(days: number = DAYS_TO_UPDATE_FOR_SCHEMA): Date {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);
    return threshold;
}

/**
 * Update recent games with new fields from schema changes
 * This ensures schema adaptation - if API adds new fields, recent games are updated
 * @param newFields - Object containing new fields to add to recent games
 * @returns Promise<number> - Number of games updated
 */
async function updateRecentGamesForSchema(newFields: Record<string, any>): Promise<number> {
    try {
        const thresholdDate = getRecentGamesDateThreshold();
        const thresholdTimestamp = thresholdDate.toISOString();

        console.log(
            `🔄 [Game Service] Updating recent games (last ${DAYS_TO_UPDATE_FOR_SCHEMA} days) with new schema fields...`
        );

        // Query games from the last N days
        const gamesRef = db.collection(GAMES_COLLECTION);
        const recentGamesSnapshot = await gamesRef
            .where("startTime", ">=", thresholdTimestamp)
            .get();

        if (recentGamesSnapshot.empty) {
            console.log("ℹ️  [Game Service] No recent games found to update");
            return 0;
        }

        let updateCount = 0;
        const batchSize = 500; // Firestore batch limit
        let currentBatch = db.batch();
        let batchOpsCount = 0;

        recentGamesSnapshot.forEach((doc) => {
            const docData = doc.data() as FirestoreGameDocument;
            let needsUpdate = false;
            const updateData: Record<string, any> = {};

            // Check top-level new fields
            for (const [key, value] of Object.entries(newFields)) {
                if (key === "homeTeam" || key === "awayTeam") {
                    // Handle nested team fields
                    const teamFields = value as Record<string, any>;
                    const existingTeam = docData[key];

                    if (existingTeam) {
                        // Merge new fields into existing team object
                        for (const [teamKey, teamValue] of Object.entries(teamFields)) {
                            if (existingTeam[teamKey] === undefined) {
                                needsUpdate = true;
                                if (!updateData[key]) {
                                    updateData[key] = { ...existingTeam };
                                }
                                updateData[key][teamKey] = teamValue;
                            }
                        }
                    } else if (teamFields) {
                        // Team object doesn't exist - this shouldn't happen for recent games
                        // but we'll handle it gracefully
                        needsUpdate = true;
                        updateData[key] = teamFields;
                    }
                } else {
                    // Top-level field
                    if (docData[key] === undefined) {
                        needsUpdate = true;
                        updateData[key] = value;
                    }
                }
            }

            if (needsUpdate) {
                if (batchOpsCount >= batchSize) {
                    // Commit current batch and start new one
                    currentBatch = db.batch();
                    batchOpsCount = 0;
                }
                currentBatch.update(doc.ref, updateData);
                batchOpsCount++;
                updateCount++;
            }
        });

        // Commit remaining batch operations
        if (batchOpsCount > 0) {
            await currentBatch.commit();
        }

        if (updateCount > 0) {
            console.log(
                `✅ [Game Service] Updated ${updateCount} recent game(s) with new schema fields`
            );
        } else {
            console.log("ℹ️  [Game Service] All recent games already have the new fields");
        }

        return updateCount;
    } catch (error) {
        console.error(`❌ [Game Service] Failed to update recent games for schema:`, error);
        throw error;
    }
}

/**
 * Extract new fields from current games by comparing with sample existing document
 * Returns fields that are new (not in existing documents)
 */
function extractNewFieldsFromGames(
    games: Game[],
    sampleExistingDoc: FirestoreGameDocument | null
): Record<string, any> {
    const newFields: Record<string, any> = {};

    // Get all unique fields from current games
    const gameFields = new Set<string>();
    const homeTeamFields = new Set<string>();
    const awayTeamFields = new Set<string>();

    games.forEach((game) => {
        // Collect top-level fields
        Object.keys(game).forEach((key) => {
            if (!["id", "startTimeUTC", "gameState", "homeTeam", "awayTeam"].includes(key)) {
                gameFields.add(key);
            }
        });

        // Collect team fields
        if (game.homeTeam) {
            Object.keys(game.homeTeam).forEach((key) => {
                if (!["id", "commonName", "score"].includes(key)) {
                    homeTeamFields.add(key);
                }
            });
        }

        if (game.awayTeam) {
            Object.keys(game.awayTeam).forEach((key) => {
                if (!["id", "commonName", "score"].includes(key)) {
                    awayTeamFields.add(key);
                }
            });
        }
    });

    // Find fields that don't exist in sample document
    if (sampleExistingDoc) {
        // Check top-level new fields
        gameFields.forEach((field) => {
            if (!(field in sampleExistingDoc)) {
                // Get a sample value from current games
                const sampleGame = games.find((g) => g[field] !== undefined);
                if (sampleGame) {
                    newFields[field] = sampleGame[field];
                }
            }
        });

        // Check homeTeam new fields
        if (sampleExistingDoc.homeTeam) {
            homeTeamFields.forEach((field) => {
                if (!(field in sampleExistingDoc.homeTeam)) {
                    const sampleGame = games.find(
                        (g) => g.homeTeam && g.homeTeam[field] !== undefined
                    );
                    if (sampleGame && sampleGame.homeTeam) {
                        if (!newFields.homeTeam) {
                            newFields.homeTeam = {};
                        }
                        newFields.homeTeam[field] = sampleGame.homeTeam[field];
                    }
                }
            });
        }

        // Check awayTeam new fields
        if (sampleExistingDoc.awayTeam) {
            awayTeamFields.forEach((field) => {
                if (!(field in sampleExistingDoc.awayTeam)) {
                    const sampleGame = games.find(
                        (g) => g.awayTeam && g.awayTeam[field] !== undefined
                    );
                    if (sampleGame && sampleGame.awayTeam) {
                        if (!newFields.awayTeam) {
                            newFields.awayTeam = {};
                        }
                        newFields.awayTeam[field] = sampleGame.awayTeam[field];
                    }
                }
            });
        }
    } else {
        // No existing document - all fields are potentially new
        // We'll let updateRecentGamesForSchema handle this
    }

    return newFields;
}

/**
 * Process and store games with schema adaptation
 * @param games - Array of game objects from NHL API
 * @returns Promise<void>
 */
async function processAndStoreGames(games: Game[]): Promise<void> {
    if (games.length === 0) {
        console.log("ℹ️  [Game Service] No games to process");
        return;
    }

    console.log(`🔄 [Game Service] Processing ${games.length} game(s)...`);

    // Store all games
    await storeGames(games);

    // Schema adaptation: Detect new fields and update recent games
    // Get a sample existing document to compare fields
    try {
        if (games.length > 0) {
            // Get a sample recent document to compare schema
            const sampleRef = db.collection(GAMES_COLLECTION);
            const sampleSnapshot = await sampleRef
                .where("startTime", ">=", getRecentGamesDateThreshold().toISOString())
                .limit(1)
                .get();

            const sampleDoc = sampleSnapshot.empty
                ? null
                : (sampleSnapshot.docs[0].data() as FirestoreGameDocument);

            // Extract only truly new fields
            const newFields = extractNewFieldsFromGames(games, sampleDoc);

            if (Object.keys(newFields).length > 0) {
                console.log(
                    `🔄 [Game Service] Detected ${Object.keys(newFields).length} new schema field(s), updating recent games...`
                );
                await updateRecentGamesForSchema(newFields);
            } else {
                console.log("ℹ️  [Game Service] No new schema fields detected");
            }
        }
    } catch (error) {
        // Schema update is best-effort, don't fail the whole operation
        console.warn(
            `⚠️  [Game Service] Schema adaptation update failed (non-critical):`,
            error
        );
    }

    console.log(`✅ [Game Service] Completed processing ${games.length} game(s)`);
}

// Export functions
export {
    storeGame,
    storeGames,
    processAndStoreGames,
    transformGameToFirestore,
    updateRecentGamesForSchema,
};

