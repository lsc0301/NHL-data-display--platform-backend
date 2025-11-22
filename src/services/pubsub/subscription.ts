/**
 * Created by: Shichen Liu
 * Date: 2025-11-21
 * 
 * Subscription instance setup
 * 
 * This module handles:
 * - Subscription instance setup
 * 
 */

import { pubSubClient } from "./client";
import { config } from "../../config";

// Pub/Sub configuration - using config module
export const SUBSCRIPTION_NAME = config.PUBSUB_SUBSCRIPTION_NAME;
export const TOPIC_NAME = config.PUBSUB_TOPIC_NAME;

// Get subscription instance
export const subscription = pubSubClient.subscription(SUBSCRIPTION_NAME);

