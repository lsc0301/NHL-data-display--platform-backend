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
