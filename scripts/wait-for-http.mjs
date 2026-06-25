#!/usr/bin/env node
const url = process.argv[2]
const timeoutMs = Number(process.argv[3] ?? 120000)
const intervalMs = Number(process.argv[4] ?? 2000)
if (!url) { console.error('usage: wait-for-http.mjs <url> [timeoutMs] [intervalMs]'); process.exit(2) }
const deadline = Date.now() + timeoutMs
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let lastErr = ''
while (Date.now() < deadline) {
	try { const res = await fetch(url); if (res.ok) { console.log(`ready: ${url} -> ${res.status}`); process.exit(0) } lastErr = `status ${res.status}` }
	catch (e) { lastErr = String(e?.message ?? e) }
	await sleep(intervalMs)
}
console.error(`timed out waiting for ${url} (${lastErr})`); process.exit(1)
