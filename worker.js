import * as screenshotone from 'screenshotone-api-sdk'

export default {
  async fetch(request, env) {
    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 })
    }

    const url = new URL(request.url)
    const targetUrl = url.searchParams.get('url')

    // Validate URL parameter
    if (!targetUrl) {
      return new Response('Missing required parameter: url', { status: 400 })
    }

    // Validate that the URL is a stagetimer.io domain
    let parsedUrl
    try {
      parsedUrl = new URL(targetUrl)
    } catch (error) {
      return new Response('Invalid URL format', { status: 400 })
    }

    if (!parsedUrl.hostname.endsWith('stagetimer.io')) {
      return new Response('Only stagetimer.io URLs are allowed', { status: 403 })
    }

    // Check for required environment variables
    if (!env.SCREENSHOTONE_ACCESS_KEY || !env.SCREENSHOTONE_SECRET_KEY) {
      return new Response('Server configuration error', { status: 500 })
    }

    try {
      // Initialize ScreenshotOne client
      const client = new screenshotone.Client(
        env.SCREENSHOTONE_ACCESS_KEY,
        env.SCREENSHOTONE_SECRET_KEY
      )

      // Add cookie_banner=0 to the target URL
      parsedUrl.searchParams.set('cookie_banner', '0')

      // Get cache key from query params or use URL as default
      const cacheKey = url.searchParams.get('cacheKey') || targetUrl

      // Build screenshot options matching the current implementation
      const options = screenshotone.TakeOptions
        .url(parsedUrl.href)
        .format('jpg')
        .blockAds(true)
        .blockCookieBanners(true)
        .blockBannersByHeuristics(true)
        .blockTrackers(true)
        .deviceScaleFactor(1)
        .viewportWidth(1200)
        .viewportHeight(627)
        .scrollIntoView('main')
        .cache(true)
        .cacheTtl(2592000) // 30 days
        .cacheKey(cacheKey)

      // Generate signed URL
      const screenshotUrl = await client.generateSignedTakeURL(options)

      // Fetch the screenshot
      const screenshotResponse = await fetch(screenshotUrl)

      if (!screenshotResponse.ok) {
        return new Response(
          `Screenshot service error: ${screenshotResponse.status}`,
          { status: screenshotResponse.status }
        )
      }

      // Return the image with proper headers
      return new Response(screenshotResponse.body, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=2592000', // 30 days
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
        },
      })
    } catch (error) {
      console.error('Error generating screenshot:', error)
      return new Response('Internal server error', { status: 500 })
    }
  },
}
