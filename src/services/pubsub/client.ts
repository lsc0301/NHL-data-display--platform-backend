/**
 * Created by: Shichen Liu
 * Date: 2025-11-21
 * 
 * Pub/Sub client initialization
 * 
 * This module handles:
 * - Pub/Sub client initialization
 */

import { PubSub } from "@google-cloud/pubsub";

// Initialize Pub/Sub client
export const pubSubClient = new PubSub();

