/**
 * Extracts the target URL from the request
 * Supports two formats:
 * 1. Query parameter: /?url=https://stagetimer.io/pricing
 * 2. Path-based: /stagetimer.io/pricing.jpg?v=2&signature=...
 *
 * @param {URL} requestUrl - The request URL object
 * @returns {string|null} - The extracted target URL or null if not found
 */
export function extractTargetUrl(requestUrl) {
  // Try query parameter first (legacy format)
  let targetUrl = requestUrl.searchParams.get('url')

  if (targetUrl) {
    return targetUrl
  }

  // Parse from path (e.g., /stagetimer.io/pricing.jpg?v=2&signature=...)
  let pathname = requestUrl.pathname

  // Remove leading slash
  if (pathname.startsWith('/')) {
    pathname = pathname.slice(1)
  }

  // Remove .jpg extension if present, preserving trailing slash
  // e.g., "stagetimer.io/output/123/.jpg" -> "stagetimer.io/output/123/"
  if (pathname.endsWith('/.jpg')) {
    pathname = pathname.slice(0, -4) // Keeps the trailing slash
  } else if (pathname.endsWith('.jpg')) {
    pathname = pathname.slice(0, -4) // No trailing slash
  }

  // Validate we have a path
  if (!pathname) {
    return null
  }

  // Construct the full URL with https://
  targetUrl = `https://${pathname}`

  // Append query parameters if present (excluding 'url' param which is legacy)
  const queryParams = new URLSearchParams(requestUrl.search)
  queryParams.delete('url') // Remove legacy param if present

  if (queryParams.toString()) {
    targetUrl += `?${queryParams.toString()}`
  }

  console.log('[Path] Parsed target URL from path:', targetUrl)

  return targetUrl
}
