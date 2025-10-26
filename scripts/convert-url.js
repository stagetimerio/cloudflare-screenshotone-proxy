#!/usr/bin/env node

/**
 * Converts a Stagetimer URL to the worker screenshot format
 * Usage: node scripts/convert-url.js <url>
 * Example: node scripts/convert-url.js "https://stagetimer.io/output/688cbdf38490dac6f25c0eba/?v=2&signature=..."
 */

const args = process.argv.slice(2)

if (args.length === 0) {
  console.error('Usage: node scripts/convert-url.js <url>')
  console.error('Example: node scripts/convert-url.js "https://stagetimer.io/pricing"')
  process.exit(1)
}

const inputUrl = args[0]

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

  // Build the worker URL
  const workerUrl = `https://preview-screenshot.stagetimer.io/${encodedPath}.jpg${url.search}`

  console.log('\n📸 Screenshot Worker URL:')
  console.log(workerUrl)
  console.log('\n📁 Filename:')
  console.log(`${encodedPath}.jpg`)
  console.log()

} catch (error) {
  console.error('❌ Invalid URL:', error.message)
  process.exit(1)
}
