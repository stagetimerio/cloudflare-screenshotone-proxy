#!/usr/bin/env node

/**
 * Converts a Stagetimer URL to the worker screenshot format
 * Usage: node scripts/convert-url.js <url>
 * Example: node scripts/convert-url.js "https://stagetimer.io/output/688cbdf38490dac6f25c0eba/?v=2&signature=..."
 */

const args = process.argv.slice(2)

if (args.length === 0) {
  console.error('Usage: node scripts/convert-url.js <url> [screenshotone-json]')
  console.error('Example: node scripts/convert-url.js "https://stagetimer.io/pricing"')
  console.error('Example: node scripts/convert-url.js "https://stagetimer.io/stats" \'{"viewport_width":960,"viewport_height":550,"device_scale_factor":2}\'')
  process.exit(1)
}

const inputUrl = args[0]
const screenshotoneParam = args[1]

try {
  const url = new URL(inputUrl)

  // Extract the path without https://
  let fullPath = url.hostname + url.pathname

  // Remove trailing slash for cleaner filenames
  if (fullPath.endsWith('/')) {
    fullPath = fullPath.slice(0, -1)
  }

  // Replace slashes with double underscores
  const encodedPath = fullPath.replace(/\//g, '__')

  // Build query string
  const params = new URLSearchParams(url.search)
  if (screenshotoneParam) {
    JSON.parse(screenshotoneParam) // validate JSON
    params.set('screenshotone', screenshotoneParam)
  }
  const query = params.toString() ? `?${params.toString()}` : ''

  // Build the worker URL
  const workerUrl = `https://preview-screenshot.stagetimer.io/${encodedPath}.jpg${query}`

  console.log('\n📸 Screenshot Worker URL:')
  console.log(workerUrl)
  console.log('\n📁 Filename:')
  console.log(`${encodedPath}.jpg`)
  console.log()

} catch (error) {
  console.error('❌ Invalid URL or JSON:', error.message)
  process.exit(1)
}
