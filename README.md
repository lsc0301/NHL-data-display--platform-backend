# NHL Data Display Platform Backend

NHL Data Display Platform Backend Project

## Overview

This project is a Node.js + TypeScript backend service designed to fetch and store NHL game data in Google Firestore. The service listens to a Pub/Sub topic and, on each message, retrieves scores for today's games and the past 7 days from a public NHL API.

### Key Features

- Stores each game as a separate document in Firestore, including team info, scores, start time, and status.
- Idempotent: prevents duplicate entries when re-run for the same date.
- Handles network errors, API failures, and partial data gracefully.
- Adaptive schema: automatically stores new fields added by the NHL API and updates recent game documents without downtime.
- Written in TypeScript, with a modular and maintainable backend architecture.

This project demonstrates skills in API integration, real-time data processing, cloud databases, and messaging patterns, showcasing a practical backend engineering implementation.

## Setup & Build

### Step 1: Initialize Project and Setup Git Repository

1. **Initialize Node.js + TypeScript Project**
   - Initialize npm project and install TypeScript dependencies
   - Configure TypeScript compiler settings
   - Set up project structure with `src/` directory for source code

2. **Setup GitHub Remote Repository**
   - Initialize git repository
   - Connect to GitHub remote repository
   - Configure remote origin

3. **Create and Separate Branches**
   - Create `main` branch for production releases
   - Create `dev` branch for active development work
   - Push both branches to remote repository

### Step 2: Create Firebase Project and Setup Firestore and Pub/Sub Messaging Service

1. **Create Firebase Project**
   - Create a new Firebase project (nhl-data-display-platform) in Firebase Console
   - Enable Firestore Database service
   - Configure Firestore database (select mode: test mode)

2. **Configure Firestore**
   - Create Firestore database instance
   - Set up appropriate security rules for test mode

3. **Configure Pub/Sub Messaging Service**
   - **Create Topic**: Create a single Pub/Sub topic for receiving messages (nhl-scores-fetch)
   - **Create Subscription**: Create one pull subscription for the topic (nhl-scores-subscriber)
   - **Configure Ack Deadline**: Set the acknowledgment deadline to 60 seconds to ensure enough time to fetch and process NHL API data before acknowledging messages
   - Note: I kept Pub/Sub setup very minimal for this assignment. The only non-default change was setting the ack deadline to 60 seconds. All other configurations use default settings.

### Step 3: Implement Firebase and Pub/Sub Service Initialization

1. **Firebase Admin SDK Initialization** (`src/services/firebase.ts`)
   - Initialize Firebase Admin SDK using service account key file from `config/` directory
   - Support for both local development (using config file) and deployment (using `GOOGLE_APPLICATION_CREDENTIALS` environment variable)
   - Implement singleton pattern to prevent multiple initializations

2. **Firestore Service** (`src/services/firestore.ts`)
   - Export Firestore database instance for use across the application
   - Requires Firebase Admin SDK to be initialized first

3. **Pub/Sub Service** (Modular structure in `src/services/pubsub/`)
   - **Client Initialization** (`client.ts`): Initialize Pub/Sub client using Application Default Credentials
   - **Subscription Setup** (`subscription.ts`): Get existing subscription instance
   - **Message Listener** (`listener.ts`): Implement message listener with ack/nack handling and error management
   - **Main Export** (`index.ts`): Unified interface for Pub/Sub functionality

4. **Configuration Module** (`src/config/index.ts`)
   - Centralized configuration management using class properties
   - Load environment variables from `.env` file
   - Provide typed access to all configuration values (Firebase, Pub/Sub, Server settings)
   - Automatic validation of configuration values

## Service Development

### Step 4: NHL API Testing

1. **Identify Public NHL API**
   - Found a public NHL API for game data
   - **API Reference**: [NHL API Reference by Zmalski](https://github.com/Zmalski/NHL-API-Reference) - Unofficial reference for the NHL API endpoints
   - **Base URL**: `https://api-web.nhle.com`
   - **Endpoints tested**:
     - `/v1/schedule/{date}` - Get schedule for a specific date (format: YYYY-MM-DD) - **Main endpoint used**
     - `/v1/score/{date}` - Get scores for a specific date (format: YYYY-MM-DD) - **Tested but not used in production** (schedule endpoint already contains all required data including scores)

2. **API Testing Script** (`src/api_test/test-nhl-api.ts`)
   - Created a test script to explore NHL API response structure
   - Tests both schedule and score endpoints with today's and yesterday's dates
   - Retrieves raw API responses to understand data format

3. **Running the Test**
   ```bash
   # Run the test script
   npx ts-node src/api_test/test-nhl-api.ts
   ```

4. **Test Output**
   - Results are saved to: `src/api_test/nhl-api-test-results.txt`
   - The output file contains:
     - Complete JSON responses from both endpoints
     - Response structure analysis (type, keys, sample data)
     - Test execution date and status
   - Console displays progress information during test execution
   - Note: Output is written to file instead of console due to large response size

5. **API Response Analysis**
   - Confirmed API returns all required fields for project:
     - `id` → gameId
     - `startTimeUTC` → startTime
     - `homeTeam.id`, `homeTeam.commonName.default` → homeTeam.id, homeTeam.name
     - `awayTeam.id`, `awayTeam.commonName.default` → awayTeam.id, awayTeam.name
     - `homeTeam.score`, `awayTeam.score` → scores (present for live and completed games)
     - `gameState` → status (FUT=scheduled, LIVE=live, OFF=final)
   - API structure: `gameWeek[].games[]` - need to iterate through nested structure
   - Score fields are optional:
     - ❌ Not present for scheduled games (`gameState: "FUT"`)
     - ✅ Present for live games (`gameState: "LIVE"`) - shows current score
     - ✅ Present for completed games (`gameState: "OFF"`) - shows final score

### Step 5: Implement NHL API Service

1. **API Service Module** (`src/api/nhlApi.ts`)
   - Created dedicated `src/api/` folder for API requests
   - Implemented NHL API service with TypeScript type definitions
   - Main functions:
     - `fetchScheduleByDate(date)` - Fetch games for a specific date
     - `fetchGamesForDateRange(days)` - Fetch games for today + previous N days (default: 7 days, total 8 days)
     - `fetchTodayGames()` - Fetch today's games
   - Automatically extracts games from nested API structure (`gameWeek[].games[]`)

2. **Error Handling**
   - **Network errors**: Handles timeout (10s) and connection errors (ENOTFOUND, ECONNREFUSED)
   - **API failures**: Handles 404 (no games) and other HTTP errors gracefully
   - **Partial data**: Validates required fields (gameId, startTime, teams, status), handles missing scores for scheduled games
   - Continues processing other dates even if one fails

3. **Logging**
   - Detailed logs at key points: request start, success, data extraction, errors
   - Performance monitoring with elapsed time
   - Clear error messages for debugging

### Step 6: Implement Game Data Processing Service

1. **Game Service Module** (`src/utils/gameService.ts`)
   - Created dedicated `src/utils/` folder for utility functions
   - Data transformation: Converts NHL API game data to Firestore document format
   - Required fields mapping:
     - `id` → `gameId`
     - `startTimeUTC` → `startTime`
     - `homeTeam.id`, `homeTeam.commonName.default` → `homeTeam.id`, `homeTeam.name`
     - `awayTeam.id`, `awayTeam.commonName.default` → `awayTeam.id`, `awayTeam.name`
     - `homeTeam.score`, `awayTeam.score` → scores (nullable)
     - `gameState` → `status` (FUT→scheduled, LIVE→live, OFF→final)

2. **Idempotency - Data Updates**
   - Uses `gameId` as Firestore document ID to ensure uniqueness
   - Checks if document exists before storing
   - **Field-level comparison**: Only updates fields that have actually changed
     - Compares each field between existing data and new data
     - Updates only changed fields (e.g., score changes, status updates)
     - Skips unchanged fields to minimize database writes
   - **Deep merge for nested objects**: Preserves existing fields in `homeTeam` and `awayTeam` while updating changed values
   - **Example**: If a live game (score: 2-1) is stored again 10 minutes later as final (score: 3-2):
     - ✅ Same document is updated (no duplicate created)
     - ✅ Only `status`, `homeTeam.score`, and `awayTeam.score` are updated
     - ✅ Other fields (gameId, startTime, team names, etc.) remain unchanged
   - Prevents duplicate entries when re-run for the same date

3. **Schema Adaptation - Automatic Field Detection and Updates**
   The system automatically adapts to new fields added by the NHL API without manual intervention:
   
   **How it works:**
   - **Automatic field detection**: Extracts all fields from current API responses
   - **Comparison with existing documents**: Compares new fields with a sample recent document to identify truly new fields
   - **New games**: Automatically store all new fields immediately
   - **Historical games update**: Updates all games from the last 30 days with new fields
   
   **Process flow:**
   1. Store new games with all fields (including new ones)
   2. After storing, detect new schema fields by comparing with sample existing document
   3. Query all games from the last 30 days (using `startTime >= threshold`)
   4. For each historical game, check if it's missing any new fields
   5. Batch update all games that need new fields (using Firestore batch operations)
   6. Preserve all existing fields while adding new ones
   
   **Example scenario:**
   - Day 1-29: System stores games without `venue` field
   - Day 30: NHL API adds `venue` field to responses
   - System behavior:
     - ✅ New games automatically store `venue` field
     - ✅ System detects `venue` is a new field (not in existing documents)
     - ✅ Automatically updates all games from last 30 days with `venue` field
     - ✅ No service interruption - schema update runs asynchronously
     - ✅ If update fails, it doesn't affect main storage operation (best-effort)
   
   **Supported field types:**
   - Top-level fields (e.g., `venue`, `broadcastInfo`)
   - Nested object fields (e.g., `homeTeam.logo`, `awayTeam.abbreviation`)
   - Deep merge preserves existing nested fields while adding new ones

4. **Error Handling**
   - Individual game storage failures don't stop batch processing
   - Uses `Promise.allSettled` to handle partial failures gracefully
   - Schema adaptation updates are non-blocking (best-effort)
   - Detailed logging for successful and failed operations
   - If schema update fails, main game storage continues normally

