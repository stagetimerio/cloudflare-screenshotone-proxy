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

#### For Local Development

Create a `.dev.vars` file in the project root with your API keys:

```bash
SCREENSHOTONE_ACCESS_KEY=your_access_key_here
SCREENSHOTONE_SECRET_KEY=your_secret_key_here
CACHE_KEY=v1
```

This file is already in `.gitignore` and will not be committed.

#### For Production Deployment

Set your ScreenshotOne API credentials as Cloudflare secrets:

```bash
wrangler secret put SCREENSHOTONE_ACCESS_KEY
wrangler secret put SCREENSHOTONE_SECRET_KEY
```

You'll be prompted to enter each value. These are stored securely in Cloudflare.

The `CACHE_KEY` is configured in `wrangler.jsonc` and can be changed to invalidate all cached screenshots on the next deployment. Simply update the value (e.g., from `v1` to `v2`) and redeploy.

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

The worker supports three URL formats:

**Path-based encoded (recommended - clean filenames):**
```
GET /{domain__{path}__{parts}}.jpg
```
Use `__` (double underscore) to replace slashes.

**Path-based literal (for manual testing):**
```
GET /{domain}/{path/with/slashes}.jpg
```

**Query parameter (legacy):**
```
GET /?url=<target-url>
```

### Examples

**Encoded format (clean filename):**
```bash
# https://stagetimer.io/output/688cbdf38490dac6f25c0eba/
curl "https://stagetimer-screenshotone-proxy.workers.dev/stagetimer.io__output__688cbdf38490dac6f25c0eba.jpg"
# → filename: stagetimer.io__output__688cbdf38490dac6f25c0eba.jpg
```

**Literal format (for testing):**
```bash
curl "https://stagetimer-screenshotone-proxy.workers.dev/stagetimer.io/output/688cbdf38490dac6f25c0eba/.jpg"
# → filename: 688cbdf38490dac6f25c0eba.jpg or .jpg
```

**Query parameter format:**
```bash
curl "https://stagetimer-screenshotone-proxy.workers.dev/?url=https://stagetimer.io/pricing"
```

### Convert Script

Use the included script to convert any Stagetimer URL to the worker format:

```bash
node scripts/convert-url.js "https://stagetimer.io/output/688cbdf38490dac6f25c0eba/?v=2&signature=..."
```

Output:
```
📸 Screenshot Worker URL:
https://stagetimer-screenshotone-proxy.workers.dev/stagetimer.io__output__688cbdf38490dac6f25c0eba.jpg?v=2&signature=...

📁 Filename:
stagetimer.io__output__688cbdf38490dac6f25c0eba.jpg
```

### JavaScript Usage

```javascript
// Encoded format (recommended - clean filename)
// Replace slashes with __ (double underscore)
const url = 'https://stagetimer.io/output/688cbdf38490dac6f25c0eba/'
const encodedPath = url.replace('https://', '').replace(/\//g, '__').replace(/__$/, '') // Remove trailing __
const screenshotUrl = `https://stagetimer-screenshotone-proxy.workers.dev/${encodedPath}.jpg`
// → stagetimer.io__output__688cbdf38490dac6f25c0eba.jpg

// Or for simple paths without slashes
const screenshotUrl = 'https://stagetimer-screenshotone-proxy.workers.dev/stagetimer.io__pricing.jpg'

// Query parameter (legacy)
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
- Cache: 30 days (controlled by `CACHE_KEY` env var)
- Scroll target: `main` element

These match the settings used in the current Stagetimer landing page implementation.

## Response Headers

The worker includes helpful metadata in response headers:

- **`Content-Disposition`**: Provides the filename (e.g., `inline; filename="stagetimer.io__output__123.jpg"`)
- **`X-Image-Width`**: Image width in pixels (`1200`)
- **`X-Image-Height`**: Image height in pixels (`627`)
- **`Content-Type`**: Always `image/jpeg`
- **`Cache-Control`**: Set to 30 days

These headers are exposed via CORS, so you can access them from JavaScript:

```javascript
const response = await fetch(screenshotUrl)
const filename = response.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1]
const width = response.headers.get('x-image-width')
const height = response.headers.get('x-image-height')

console.log(`${filename}: ${width}x${height}`) // stagetimer.io__output__123.jpg: 1200x627
```

### Cache Invalidation

All screenshots use the same cache key from the `CACHE_KEY` environment variable. To invalidate all cached screenshots (e.g., after a major design change), simply update the `CACHE_KEY` in `wrangler.jsonc` (e.g., from `v1` to `v2`) and redeploy.

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
