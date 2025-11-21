# NHL Data Display Platform Backend

NHL Data Display Platform Backend Project

## Tech Stack

- Node.js
- TypeScript
- npm

## Project Structure

```
.
├── src/              # Source code directory
│   └── index.ts     # Entry file
├── dist/            # Compiled JavaScript files (auto-generated)
├── package.json      # Project configuration and dependencies
├── tsconfig.json    # TypeScript configuration
└── README.md        # Project documentation
```

## Installation

```bash
npm install
```

## Development

### Development Mode (Auto-restart)

```bash
npm run dev
```

### Watch Mode (Auto-restart on file changes)

```bash
npm run watch
```

## Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

Compiled files will be output to the `dist/` directory.

## Run

Run compiled code:

```bash
npm start
```

## Scripts

- `npm run build` - Compile TypeScript code
- `npm run dev` - Run TypeScript directly with ts-node (development mode)
- `npm run watch` - Watch for file changes and auto-restart (development mode)
- `npm start` - Run compiled JavaScript code (production mode)

## Environment Variables

- `PORT` - Server port (default: 3000)

## License

ISC

