/**
 * Created by: Shichen Liu
 * Date: 2025-11-21
 * 
 * NHL API service - Test version
 * 
 * This module is for testing NHL API responses to understand the data structure.
 * Will be refactored later based on actual API response format.
 */

import axios, { AxiosInstance } from "axios";

// NHL API Base URL
const NHL_API_BASE_URL = "https://api-web.nhle.com";

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
     * Fetch schedule for a specific date
     * @param date - Date in YYYY-MM-DD format
     * @returns Raw API response
     */
    async fetchScheduleByDate(date: string): Promise<any> {
        try {
            console.log(`📡 Fetching NHL schedule for date: ${date}`);
            const response = await this.client.get(`/v1/schedule/${date}`);

            console.log(`✅ Successfully fetched data for ${date}`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 404) {
                    console.warn(`⚠️  No schedule found for date: ${date} (404)`);
                    return null;
                }
                throw new Error(
                    `NHL API error for date ${date}: ${error.message} - Status: ${error.response?.status}`
                );
            }
            throw error;
        }
    }

    /**
     * Fetch scores for a specific date
     * @param date - Date in YYYY-MM-DD format
     * @returns Raw API response
     */
    async fetchScoresByDate(date: string): Promise<any> {
        try {
            console.log(`📡 Fetching NHL scores for date: ${date}`);
            const response = await this.client.get(`/v1/score/${date}`);

            console.log(`✅ Successfully fetched scores for ${date}`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 404) {
                    console.warn(`⚠️  No scores found for date: ${date} (404)`);
                    return null;
                }
                throw new Error(
                    `NHL API error for date ${date}: ${error.message} - Status: ${error.response?.status}`
                );
            }
            throw error;
        }
    }
}

// Export singleton instance
export const nhlApiService = new NhlApiService();

