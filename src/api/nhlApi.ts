/**
 * Created by: Shichen Liu
 * Date: 2025-11-21
 * 
 * NHL API service
 * 
 * This module handles:
 * - Fetching NHL game data from public NHL API
 * - Retrieving schedule for today and past N days
 * - Error handling for network errors and API failures
 */

import axios, { AxiosInstance } from "axios";
import { config } from "../config";

// Configuration constants
const NHL_API_BASE_URL = config.NHL_API_BASE_URL;

/**
 * NHL API Response Types
 * Based on actual API response structure from testing
 */
export interface Team {
    id: number;
    commonName: {
        default: string;
        [key: string]: any;
    };
    placeName?: {
        default: string;
        [key: string]: any;
    };
    abbrev?: string;
    score?: number; // Present for LIVE and OFF games, absent for FUT games
    [key: string]: any; // Allow for additional fields from API
}

export interface Game {
    id: number;
    season: number;
    gameType: number;
    startTimeUTC: string;
    gameState: string; // "FUT", "LIVE", "OFF"
    homeTeam: Team;
    awayTeam: Team;
    [key: string]: any; // Allow for additional fields from API
}

export interface GameWeek {
    date: string;
    dayAbbrev: string;
    numberOfGames: number;
    games: Game[];
    [key: string]: any;
}

export interface ScheduleResponse {
    nextStartDate?: string;
    previousStartDate?: string;
    gameWeek: GameWeek[];
    [key: string]: any;
}

class NhlApiService {
    private client: AxiosInstance;

    constructor(baseUrl: string = NHL_API_BASE_URL) {
        this.client = axios.create({
            baseURL: baseUrl,
            timeout: 10000, // 10 second timeout
            headers: {
                "Accept": "application/json",
            },
        });
    }

    /**
     * Format date to YYYY-MM-DD format
     */
    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    /**
     * Validate game data - check for required fields and handle partial data
     * @param game - Game object to validate
     * @param date - Date string for logging
     * @returns true if game has required fields, false otherwise
     */
    private validateGameData(game: any, date: string): boolean {
        // Check required fields
        if (!game.id) {
            console.warn(
                `⚠️  [NHL API] Game missing required field 'id' for date ${date}, skipping game`
            );
            return false;
        }

        if (!game.startTimeUTC) {
            console.warn(
                `⚠️  [NHL API] Game ${game.id} missing required field 'startTimeUTC' for date ${date}, skipping game`
            );
            return false;
        }

        if (!game.gameState) {
            console.warn(
                `⚠️  [NHL API] Game ${game.id} missing required field 'gameState' for date ${date}, skipping game`
            );
            return false;
        }

        // Check team data
        if (!game.homeTeam || !game.homeTeam.id || !game.homeTeam.commonName?.default) {
            console.warn(
                `⚠️  [NHL API] Game ${game.id} missing required homeTeam data for date ${date}, skipping game`
            );
            return false;
        }

        if (!game.awayTeam || !game.awayTeam.id || !game.awayTeam.commonName?.default) {
            console.warn(
                `⚠️  [NHL API] Game ${game.id} missing required awayTeam data for date ${date}, skipping game`
            );
            return false;
        }

        // Handle partial data - score is optional (only present for LIVE and OFF games)
        // This is expected behavior, so we just log it for information
        if (game.gameState === "LIVE" || game.gameState === "OFF") {
            if (game.homeTeam.score === undefined || game.awayTeam.score === undefined) {
                console.warn(
                    `⚠️  [NHL API] Game ${game.id} (${game.gameState}) missing score data for date ${date} - this may indicate incomplete API response`
                );
                // Don't skip the game, just log the warning - score can be set to null/0 later
            }
        }

        return true;
    }

    /**
     * Get dates to fetch (today + previous N days)
     */
    private getDatesToFetch(days: number = 7): string[] {
        const dates: string[] = [];
        const today = new Date();

        // Add today
        dates.push(this.formatDate(today));

        // Add previous days
        for (let i = 1; i <= days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(this.formatDate(date));
        }

        return dates;
    }

    /**
     * Fetch schedule for a specific date
     * @param date - Date in YYYY-MM-DD format
     * @returns Schedule response with games array
     */
    async fetchScheduleByDate(date: string): Promise<Game[]> {
        const startTime = Date.now();
        console.log(`📡 [NHL API] Fetching schedule for date: ${date}`);

        try {
            const response = await this.client.get<ScheduleResponse>(
                `/v1/schedule/${date}`
            );

            console.log(
                `✅ [NHL API] Successfully received response for ${date} (${Date.now() - startTime}ms)`
            );

            // Extract games from nested structure: gameWeek[].games[]
            const allGames: Game[] = [];
            if (response.data?.gameWeek && Array.isArray(response.data.gameWeek)) {
                for (const week of response.data.gameWeek) {
                    if (week.games && Array.isArray(week.games)) {
                        // Validate and filter games with required fields
                        for (const game of week.games) {
                            if (this.validateGameData(game, date)) {
                                allGames.push(game);
                            }
                        }
                    }
                }
            }

            console.log(
                `📊 [NHL API] Extracted ${allGames.length} game(s) for ${date}`
            );

            return allGames;
        } catch (error) {
            const elapsedTime = Date.now() - startTime;
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 404) {
                    // No games on this date, return empty array
                    console.warn(
                        `⚠️  [NHL API] No games found for date: ${date} (404) - ${elapsedTime}ms`
                    );
                    return [];
                }

                // Handle network errors
                if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
                    console.error(
                        `❌ [NHL API] Timeout error for date ${date}: ${error.message} - ${elapsedTime}ms`
                    );
                    throw new Error(
                        `NHL API timeout for date ${date}: Request exceeded 10 second timeout`
                    );
                }

                if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
                    console.error(
                        `❌ [NHL API] Network error for date ${date}: ${error.message} - ${elapsedTime}ms`
                    );
                    throw new Error(
                        `NHL API network error for date ${date}: Unable to connect to API server`
                    );
                }

                // Handle other HTTP errors
                console.error(
                    `❌ [NHL API] Error for date ${date}: Status ${error.response?.status} - ${error.message} - ${elapsedTime}ms`
                );
                throw new Error(
                    `NHL API error for date ${date}: ${error.message} - Status: ${error.response?.status}`
                );
            }

            // Handle unknown errors
            console.error(
                `❌ [NHL API] Unexpected error for date ${date}:`,
                error,
                `- ${elapsedTime}ms`
            );
            throw error;
        }
    }

    /**
     * Fetch games for multiple dates (today + previous N days)
     * @param days - Number of previous days to fetch (default: 7)
     * @returns Array of all games across all dates
     */
    async fetchGamesForDateRange(days: number = 7): Promise<Game[]> {
        const startTime = Date.now();
        const dates = this.getDatesToFetch(days);
        const totalDates = dates.length;

        console.log(
            `📡 [NHL API] Starting to fetch games for ${totalDates} date(s): ${days} day(s) back`
        );
        console.log(`📅 [NHL API] Dates to fetch: ${dates.join(", ")}`);

        const allGames: Game[] = [];

        // Fetch games for each date in parallel
        const fetchPromises = dates.map((date) => this.fetchScheduleByDate(date));
        const results = await Promise.allSettled(fetchPromises);

        // Combine all successful results
        let successCount = 0;
        let failureCount = 0;

        results.forEach((result, index) => {
            if (result.status === "fulfilled") {
                const gamesForDate = result.value;
                allGames.push(...gamesForDate);
                successCount++;
                if (gamesForDate.length > 0) {
                    console.log(
                        `✅ [NHL API] Successfully fetched ${gamesForDate.length} game(s) for ${dates[index]}`
                    );
                }
            } else {
                failureCount++;
                console.error(
                    `❌ [NHL API] Failed to fetch games for date ${dates[index]}:`,
                    result.reason instanceof Error
                        ? result.reason.message
                        : String(result.reason)
                );
                // Continue processing other dates even if one fails
            }
        });

        const elapsedTime = Date.now() - startTime;
        console.log(
            `📊 [NHL API] Completed fetching games: ${allGames.length} total game(s) from ${successCount}/${totalDates} date(s) (${failureCount} failed) - ${elapsedTime}ms`
        );

        return allGames;
    }

    /**
     * Fetch today's games
     */
    async fetchTodayGames(): Promise<Game[]> {
        const today = this.formatDate(new Date());
        console.log(`📅 [NHL API] Fetching today's games: ${today}`);
        return this.fetchScheduleByDate(today);
    }
}

// Export singleton instance
export const nhlApiService = new NhlApiService();

