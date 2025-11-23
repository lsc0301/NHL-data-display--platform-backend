/**
 * Test script for NHL API
 * 
 * This script tests NHL API endpoints to see the actual response structure.
 * Outputs results to a text file instead of console.
 * Run with: npm run dev -- src/test-nhl-api.ts
 * Or: ts-node src/test-nhl-api.ts
 */

import { nhlApiService } from "../api/nhlApi";
import { writeFileSync } from "fs";
import { join } from "path";

async function testNhlApi() {
    const output: string[] = [];

    output.push("🧪 Testing NHL API endpoints...\n");
    output.push("=".repeat(80));
    output.push(`Test Date: ${new Date().toISOString()}\n`);

    try {
        // Test 1: Get today's date
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD format

        // Test 2: Get a recent date (yesterday)
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        output.push("\n" + "=".repeat(80));
        output.push("TEST 1: Schedule endpoint (/v1/schedule/{date})");
        output.push("=".repeat(80));

        // Test schedule endpoint with today's date
        output.push(`\n📅 Testing with today's date: ${todayStr}\n`);
        console.log(`📡 Fetching schedule for ${todayStr}...`);
        const scheduleToday = await nhlApiService.fetchScheduleByDate(todayStr);

        if (scheduleToday) {
            output.push("\n📋 Schedule Response Structure:\n");
            output.push(JSON.stringify(scheduleToday, null, 2));
            output.push("\n\n📊 Response Type: " + typeof scheduleToday);
            if (Array.isArray(scheduleToday)) {
                output.push(`\n📦 Is Array: true | Length: ${scheduleToday.length}`);
                if (scheduleToday.length > 0) {
                    output.push("\n📝 First Item Keys: " + Object.keys(scheduleToday[0]).join(", "));
                }
            } else {
                output.push("\n📦 Is Object: true");
                output.push("\n📝 Top Level Keys: " + Object.keys(scheduleToday).join(", "));
            }
        } else {
            output.push("\n❌ No schedule data returned");
        }

        // Test schedule endpoint with yesterday's date
        output.push(`\n\n📅 Testing with yesterday's date: ${yesterdayStr}\n`);
        console.log(`📡 Fetching schedule for ${yesterdayStr}...`);
        const scheduleYesterday = await nhlApiService.fetchScheduleByDate(yesterdayStr);

        if (scheduleYesterday) {
            output.push("\n📋 Schedule Response Structure:\n");
            output.push(JSON.stringify(scheduleYesterday, null, 2));
        }

        output.push("\n\n" + "=".repeat(80));
        output.push("✅ Test completed!");
        output.push("=".repeat(80));

        // Write to file
        const outputPath = join(__dirname, "..", "nhl-api-test-results.txt");
        const outputContent = output.join("\n");
        writeFileSync(outputPath, outputContent, "utf-8");

        console.log(`\n✅ Test completed! Results saved to: ${outputPath}`);
        console.log(`📄 File location: ${outputPath}`);

    } catch (error) {
        const errorMsg = `\n❌ Test failed with error:\n${error}\n`;
        output.push(errorMsg);

        // Write error to file as well
        const outputPath = join(__dirname, "..", "nhl-api-test-results.txt");
        writeFileSync(outputPath, output.join("\n"), "utf-8");

        console.error(errorMsg);
        console.error(`📄 Error details saved to: ${outputPath}`);
        process.exit(1);
    }
}

// Run the test
testNhlApi();

