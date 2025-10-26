/**
 * Extracts the target URL from the request
 * Supports two formats:
 * 1. Query parameter: /?url=https://stagetimer.io/pricing
 * 2. Path-based: /stagetimer.io/pricing.jpg
 *
 * @param {URL} requestUrl - The request URL object
 * @returns {string|null} - The extracted target URL or null if not found
 */
export function extractTargetUrl(requestUrl) {
  // Try query parameter first
  let targetUrl = requestUrl.searchParams.get('url')

  if (targetUrl) {
    return targetUrl
  }

  // Parse from path (e.g., /stagetimer.io/pricing.jpg)
  let pathname = requestUrl.pathname

  // Remove leading slash
  if (pathname.startsWith('/')) {
    pathname = pathname.slice(1)
  }

  // Remove .jpg extension if present
  if (pathname.endsWith('.jpg')) {
    pathname = pathname.slice(0, -4)
  }

  // Validate we have a path
  if (!pathname) {
    return null
  }

  // Construct the full URL with https://
  targetUrl = `https://${pathname}`
  console.log('[Path] Parsed target URL from path:', targetUrl)

  return targetUrl
}
