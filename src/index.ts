/**
 * NHL Data Display Platform Backend
 * Main entry file
 */

console.log('🚀 NHL Data Display Platform Backend starting...');

// Example: Simple server startup
const PORT = process.env.PORT || 3000;

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

