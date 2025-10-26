import * as screenshotone from 'screenshotone-api-sdk'
import { extractTargetUrl } from './utils.js'

export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url)
    console.log(`[Request] ${request.method} ${requestUrl.pathname}${requestUrl.search}`)

    // Only allow GET requests
    if (request.method !== 'GET') {
      console.log('[Error] Method not allowed:', request.method)
      return new Response('Method not allowed', { status: 405 })
    }

    // Extract target URL from request
    const targetUrl = extractTargetUrl(requestUrl)

    if (!targetUrl) {
      console.log('[Error] Missing URL in path or query parameter')
      return new Response('Missing URL: use /{domain}/{path}.jpg or ?url={url}', { status: 400 })
    }

    // Validate that the URL is a stagetimer.io domain
    let parsedUrl
    try {
      parsedUrl = new URL(targetUrl)
    } catch (error) {
      console.log('[Error] Invalid URL format:', targetUrl, error.message)
      return new Response('Invalid URL format', { status: 400 })
    }

    if (!parsedUrl.hostname.endsWith('stagetimer.io')) {
      console.log('[Error] Forbidden domain:', parsedUrl.hostname)
      return new Response('Only stagetimer.io URLs are allowed', { status: 403 })
    }

    console.log('[Processing] Screenshot for:', targetUrl)

    // Check for required environment variables
    if (!env.SCREENSHOTONE_ACCESS_KEY || !env.SCREENSHOTONE_SECRET_KEY) {
      console.log('[Error] Missing API credentials')
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

      // Use cache key from environment variable (can be rolled on deployment)
      const cacheKey = env.CACHE_KEY || 'default'
      console.log('[Cache] Using cache key:', cacheKey)

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
      console.log('[ScreenshotOne] Generated signed URL')

      // Fetch the screenshot
      const screenshotResponse = await fetch(screenshotUrl)

      if (!screenshotResponse.ok) {
        const errorBody = await screenshotResponse.text()
        console.log('[Error] ScreenshotOne API error:', screenshotResponse.status, screenshotResponse.statusText)
        console.log('[Error] Response body:', errorBody)
        return new Response(
          `Screenshot service error: ${screenshotResponse.status}`,
          { status: screenshotResponse.status }
        )
      }

      console.log('[Success] Returning screenshot image')

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
