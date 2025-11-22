/**
 * Created by: Shichen Liu
 * Date: 2025-11-21
 * 
 * Firestore service
 * 
 * This module handles:
 * - Firestore database instance initialization
 * 
 */

import { admin } from "./firebase";
export const db = admin.firestore();

