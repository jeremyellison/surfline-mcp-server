# Surfline MCP Server - Portugal Edition

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that provides comprehensive surf forecasts from Surfline's API for Portuguese mainland surf spots. Access detailed surf conditions, swell analysis, forecaster insights, tides, and more directly through Claude or any MCP-compatible client.

## Features

🌊 **Comprehensive Surf Data**

* Current conditions for (what I hope is) all Portuguese spots
* Detailed swell breakdown (height, period, direction, power for each swell component)
* 8-hour hourly forecasts showing how conditions evolve
* Expert forecaster observations with AM/PM specific timing advice
* Wind conditions (speed, direction, offshore/onshore classification)
* Quality ratings (1-5 stars)

🌅 **Timing Information**

* Sunrise, sunset, dawn, and dusk times
* Tide schedule with high/low times and heights
* All times properly converted to Europe/Lisbon timezone

🔐 **Secure Authentication**

* Google OAuth integration for secure access
* Works seamlessly with claude.ai web and mobile
* No Surfline API keys required (uses public endpoints)

## Quick Start

### Prerequisites

* Node.js 18+
* A Cloudflare account (free tier works)
* A Google Cloud project for OAuth (free)

### Installation

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/jeremyellison/surfline-mcp-server.git
   cd surfline-mcp-server
   npm install
   ```

2. Set up Google OAuth:
   * Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   * Create a new OAuth 2.0 Client ID (Web application type)
   * Add authorized redirect URIs:
     - `https://your-worker-name.your-subdomain.workers.dev/callback`
     - `https://claude.ai/api/mcp/auth_callback`
   * Note your Client ID and Client Secret

3. Create a KV namespace:
   ```bash
   npx wrangler kv namespace create OAUTH_KV
   ```
   Update `wrangler.jsonc` with the returned KV ID.

4. Set secrets:
   ```bash
   echo 'YOUR_GOOGLE_CLIENT_ID' | npx wrangler secret put GOOGLE_CLIENT_ID
   echo 'YOUR_GOOGLE_CLIENT_SECRET' | npx wrangler secret put GOOGLE_CLIENT_SECRET
   echo $(openssl rand -hex 32) | npx wrangler secret put COOKIE_ENCRYPTION_KEY
   ```

5. Deploy:
   ```bash
   npm run deploy
   ```

### Connect to Claude

1. Go to [claude.ai](https://claude.ai)
2. Navigate to Settings → Integrations
3. Add your deployed worker URL: `https://your-worker-name.your-subdomain.workers.dev/mcp`
4. Authenticate with Google
5. Ask Claude: "How's the surf in Portugal?" or "What are the conditions at Supertubos?"

## Available Tools

### `get_complete_surf_report`

**Primary tool** - Returns everything in one call:

* Forecaster notes with expert observations
* Sunrise/sunset times
* Tide schedule
* Current conditions for all spots
* Swell breakdown
* 8-hour forecasts

### Secondary Tools

Individual data fetchers available if you need specific information:

* `get_surf_forecast` - Basic spot conditions only
* `get_forecaster_notes` - Human observations only
* `get_tides` - Tide information only
* `get_best_spot` - Ranked recommendations

## Data Source

This server uses Surfline's undocumented public API endpoints - the same ones their website uses. No API keys or authentication required for basic forecast data. The endpoints have been stable for years and are widely used by the surf community.

**Important:** Webcams and premium features are not available through these endpoints.

## Extending to Other Regions

To add more Portuguese spots or spots from other regions, edit `src/index.ts` and add to the `PORTUGAL_SPOTS` object:

```typescript
const PORTUGAL_SPOTS: Record<string, string> = {
  "Your Spot Name": "spotIdFromSurfline",
  // ...
};
```

Find spot IDs by inspecting network requests on surfline.com when viewing a spot page.

## Architecture

* **Cloudflare Workers**: Serverless hosting (free tier: 100k requests/day)
* **Durable Objects**: OAuth state management
* **KV Storage**: Token persistence
* **Google OAuth**: Secure authentication
* **MCP Protocol**: Standard tool interface for AI assistants

## Development

Run locally:
```bash
npm run dev
```

The server will be available at `http://localhost:8788`

Test with MCP Inspector:
```bash
npx @modelcontextprotocol/inspector
```

## License

MIT

## Acknowledgments

* Surfline for providing accessible surf forecast data
* Cloudflare for the MCP and OAuth libraries
* The Portuguese surf community
* Original Santa Cruz implementation by [englishar](https://github.com/englishar/surfline-mcp-server)

---

**Boas ondas! 🏄‍♂️🇵🇹**
