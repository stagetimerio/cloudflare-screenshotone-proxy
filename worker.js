import * as screenshotone from 'screenshotone-api-sdk'
import { extractTargetUrl, generateFilename } from './utils.js'

export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url)

    // Handle robots.txt
    if (requestUrl.pathname === '/robots.txt') {
      return new Response('User-agent: *\nAllow: /\n', {
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // Only allow GET and HEAD requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      console.log(`[Error] ${request.method} ${requestUrl.pathname} - Method not allowed`)
      return new Response('Method not allowed', { status: 405 })
    }

    // Extract and remove screenshotone overrides before URL extraction
    // Usage: ?screenshotone={"viewport_width":960,"viewport_height":550,"device_scale_factor":2}
    let screenshotOverrides = {}
    const rawOverrides = requestUrl.searchParams.get('screenshotone')
    if (rawOverrides) {
      try {
        screenshotOverrides = JSON.parse(rawOverrides)
      } catch (e) {
        return new Response('Invalid screenshotone JSON parameter', { status: 400 })
      }
      requestUrl.searchParams.delete('screenshotone')
    }

    // Extract target URL from request
    const targetUrl = extractTargetUrl(requestUrl)

    if (!targetUrl) {
      console.log(`[Error] ${requestUrl.pathname} - Missing URL`)
      return new Response('Missing URL: use /{domain}/{path}.jpg or ?url={url}', { status: 400 })
    }

    // Validate that the URL is a stagetimer.io domain (including subdomains like staging.stagetimer.io)
    let parsedUrl
    try {
      parsedUrl = new URL(targetUrl)
    } catch (error) {
      console.log(`[Error] ${targetUrl} - Invalid URL format:`, error.message)
      return new Response('Invalid URL format', { status: 400 })
    }

    if (!parsedUrl.hostname.endsWith('stagetimer.io')) {
      console.log(`[Error] ${targetUrl} - Forbidden domain: ${parsedUrl.hostname}`)
      return new Response('Only *.stagetimer.io URLs are allowed', { status: 403 })
    }

    // Check for required environment variables
    if (!env.SCREENSHOTONE_ACCESS_KEY || !env.SCREENSHOTONE_SECRET_KEY) {
      console.log(`[Error] ${targetUrl} - Missing API credentials`)
      return new Response('Server configuration error', { status: 500 })
    }

    // Log the request (compact format)
    console.log(`→ ${targetUrl}`)

    try {
      // Initialize ScreenshotOne client
      const client = new screenshotone.Client(
        env.SCREENSHOTONE_ACCESS_KEY,
        env.SCREENSHOTONE_SECRET_KEY
      )

      // Use cache key from: screenshotone param > request header > env variable
      const cacheKey = screenshotOverrides.cache_key || request.headers.get('x-cache-key') || env.CACHE_KEY || 'default'

      // Build screenshot options matching the current implementation
      const o = screenshotOverrides
      const options = screenshotone.TakeOptions
        .url(targetUrl)
        .format('jpg')
        .blockAds(true)
        .blockCookieBanners(true)
        .blockBannersByHeuristics(true)
        .blockTrackers(true)
        .deviceScaleFactor(o.device_scale_factor || 1)
        .viewportWidth(o.viewport_width || 1200)
        .viewportHeight(o.viewport_height || 627)
        .scrollIntoView(o.scroll_into_view ?? 'main')
        .cache(true)
        .cacheTtl(2592000) // 30 days
        .cacheKey(cacheKey)

      // Generate signed URL
      const screenshotUrl = await client.generateSignedTakeURL(options)

      // Fetch the screenshot (always use GET to ScreenshotOne, even for HEAD requests)
      const screenshotResponse = await fetch(screenshotUrl)

      if (!screenshotResponse.ok) {
        const errorBody = await screenshotResponse.text()
        console.log(`[Error] ${targetUrl} - ScreenshotOne API error`)
        console.log(`  Status: ${screenshotResponse.status} ${screenshotResponse.statusText}`)
        console.log(`  URL: ${screenshotUrl}`)
        console.log(`  Response:`, errorBody)
        return new Response(
          `Screenshot service error: ${screenshotResponse.status}`,
          { status: screenshotResponse.status }
        )
      }

      // Generate filename from request
      const filename = generateFilename(requestUrl)

      // Build response headers
      const headers = {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=2592000', // 30 days
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD',
        'Access-Control-Allow-Headers': 'X-Cache-Key',
        'Access-Control-Expose-Headers': 'Content-Disposition, X-Image-Width, X-Image-Height',
        'X-Image-Width': String(o.viewport_width || 1200),
        'X-Image-Height': String(o.viewport_height || 627),
      }

      // Include Content-Length if available from upstream response
      const contentLength = screenshotResponse.headers.get('Content-Length')
      if (contentLength) {
        headers['Content-Length'] = contentLength
      }

      // Return the image with proper headers including metadata
      // For HEAD requests, return null body; for GET requests, return the image
      return new Response(request.method === 'HEAD' ? null : screenshotResponse.body, { headers })
    } catch (error) {
      console.log(`[Error] ${targetUrl} - Internal error`)
      console.log(`  Message:`, error.message)
      console.log(`  Stack:`, error.stack)
      return new Response('Internal server error', { status: 500 })
    }
  },
}
