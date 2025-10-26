/**
 * Extracts the target URL from the request
 * Supports multiple formats:
 * 1. Query parameter: /?url=https://stagetimer.io/pricing
 * 2. Path-based (literal): /stagetimer.io/output/123/.jpg
 * 3. Path-based (encoded): /stagetimer.io__output__123.jpg (__ replaces /)
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

  // Parse from path
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

  // Detect if this is the encoded format (domain__path__parts)
  // vs literal format (domain/path/with/slashes)
  // Encoded format uses __ (double underscore) for slashes
  if (pathname.includes('__')) {
    // Convert double underscores back to slashes
    const decodedPath = pathname.replace(/__/g, '/')
    targetUrl = `https://${decodedPath}`
  } else {
    // Literal format - use as-is
    targetUrl = `https://${pathname}`
  }

  // Append query parameters if present (excluding 'url' param which is legacy)
  const queryParams = new URLSearchParams(requestUrl.search)
  queryParams.delete('url') // Remove legacy param if present

  if (queryParams.toString()) {
    targetUrl += `?${queryParams.toString()}`
  }

  return targetUrl
}

/**
 * Generates a filename from the request URL
 * @param {URL} requestUrl - The request URL object
 * @returns {string} - The filename for the screenshot
 */
export function generateFilename(requestUrl) {
  let pathname = requestUrl.pathname

  // Remove leading slash
  if (pathname.startsWith('/')) {
    pathname = pathname.slice(1)
  }

  // If already ends with .jpg, use as-is
  if (pathname.endsWith('.jpg')) {
    return pathname.split('/').pop() // Get last segment
  }

  // For encoded format (contains __), use the whole path
  if (pathname.includes('__')) {
    return `${pathname}.jpg`
  }

  // For literal format, try to extract a meaningful part
  const segments = pathname.split('/')
  if (segments.length > 1) {
    // Use domain + last path segment
    return `${segments[0]}__${segments[segments.length - 1]}.jpg`
  }

  // Fallback
  return `${pathname}.jpg`
}
