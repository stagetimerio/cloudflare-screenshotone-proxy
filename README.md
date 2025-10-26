# ScreenshotOne Proxy Worker

A simple Cloudflare Worker that acts as a secure proxy for the ScreenshotOne API, specifically for taking screenshots of Stagetimer.io URLs.

## Purpose

This worker wraps the ScreenshotOne API to:
- Hide API credentials from client-side code
- Restrict screenshots to stagetimer.io domains only
- Return screenshot images directly to clients
- Apply consistent screenshot settings across the platform

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Keys

Set your ScreenshotOne API credentials as Cloudflare secrets:

```bash
wrangler secret put SCREENSHOTONE_ACCESS_KEY
wrangler secret put SCREENSHOTONE_SECRET_KEY
```

You'll be prompted to enter each value. These are stored securely and not visible in your code.

### 3. Development

Run the worker locally:

```bash
npm run dev
```

This starts a local server at `http://localhost:8787`

## Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

The worker will be available at `https://stagetimer-screenshotone-proxy.<your-subdomain>.workers.dev`

## Usage

### API Endpoint

```
GET /?url=<target-url>[&cacheKey=<cache-key>]
```

### Parameters

- `url` (required): The stagetimer.io URL to screenshot
- `cacheKey` (optional): Custom cache key for the screenshot. Defaults to the URL.

### Example

```bash
curl "https://stagetimer-screenshotone-proxy.workers.dev/?url=https://stagetimer.io/pricing"
```

### JavaScript Usage

```javascript
const screenshotUrl = `https://stagetimer-screenshotone-proxy.workers.dev/?url=${encodeURIComponent('https://stagetimer.io/pricing')}`

// Use in an img tag
<img src={screenshotUrl} alt="Screenshot" />

// Or fetch directly
const response = await fetch(screenshotUrl)
const blob = await response.blob()
```

## Screenshot Settings

The worker applies the following settings to all screenshots:

- Format: JPEG
- Viewport: 1200x627px
- Device scale: 1x
- Blocks: Ads, cookie banners, trackers
- Cache: 30 days
- Scroll target: `main` element

These match the settings used in the current Stagetimer landing page implementation.

## Security

- Only allows GET requests
- Restricts screenshots to `*.stagetimer.io` domains
- API credentials are stored as Cloudflare secrets (never in code)
- CORS enabled for cross-origin requests

## Monitoring

View real-time logs:

```bash
npm run tail
```

Or view in the Cloudflare dashboard: https://dash.cloudflare.com

## Error Responses

- `400 Bad Request`: Missing or invalid URL parameter
- `403 Forbidden`: URL is not a stagetimer.io domain
- `405 Method Not Allowed`: Non-GET request
- `500 Internal Server Error`: Screenshot service error or missing API keys
