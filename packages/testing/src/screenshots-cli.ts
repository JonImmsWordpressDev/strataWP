#!/usr/bin/env node
import { runScreenshotsCli } from './screenshots/run'

void runScreenshotsCli(process.argv.slice(2), {
  cwd: process.cwd(),
  env: process.env,
  out: (text) => console.log(text),
  err: (text) => console.error(text),
}).then((code) => {
  process.exitCode = code
})
