#!/usr/bin/env bun

import "zx/globals"
import Ffmpeg from "../api/ffmpeg.js"
import { Command } from "@commander-js/extra-typings"
import windowSize from "window-size"

const program = new Command("ffpro")
    .allowUnknownOption(true)
    .description(
        "ffpro commands show progress bar for your ffmpeg commands. Run man ffmpeg or ffmpeg --help for ffmpeg releted help."
    )
    .configureHelp({ helpWidth: windowSize?.get()?.width })
    .action(async () => {
        const args = process.argv.slice(2)
        const ffmpegProcess = $`ffmpeg ${args} 2>&1`
        await Ffmpeg.progress(ffmpegProcess)
    })

program.parse()
