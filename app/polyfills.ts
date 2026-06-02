// Polyfills for Windows 7 browsers (Chrome 109 / Firefox 115 ESR)
// Must be imported at the very top of the client entry point

// Stream API for AI SDK SSE responses
import "web-streams-polyfill"

// Core-js provides: structuredClone, Array.prototype.toSorted/toReversed,
// Intl.Segmenter, and other ES2022+ features missing in Chrome 109
import "core-js/actual"
