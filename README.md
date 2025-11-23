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

