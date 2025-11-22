/**
 * Created by: Shichen Liu
 * Date: 2025-11-21
 * 
 * NHL Data Display Platform Backend
 * Main entry file
 * 
 * This file is the main entry point for the backend server.
 */

import { config } from "./config";

console.log('🚀 NHL Data Display Platform Backend starting...');

// Server configuration
const PORT = config.PORT;

console.log(`Server will run on port ${PORT}`);
console.log('Project initialization completed!');

// Export example function
export function greet(name: string): string {
    return `Hello, ${name}! Welcome to NHL Data Display Platform Backend`;
}

// If running this file directly
if (require.main === module) {
    console.log(greet('Developer'));
}

