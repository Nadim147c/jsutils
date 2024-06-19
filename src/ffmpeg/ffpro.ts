#!/usr/bin/env zx

import "zx/globals"
import Ffmpeg from "../api/ffmpeg.js"

const argv = minimist(process.argv.slice(3), {
    alias: { help: ["h"] },
    boolean: ["help", "debug"],
})

if (argv.debug) console.log(argv)

const args = process.argv.slice(3).filter((item) => item !== "--debug")

if (argv.help || !args.length) console.error("ffpro is wrapper for ffmpeg")

const ffmpegProcess = $`ffmpeg ${args} 2>&1`
await Ffmpeg.progress(ffmpegProcess)
