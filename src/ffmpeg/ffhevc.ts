#!/usr/bin/env bun

import { Command, Option } from "@commander-js/extra-typings"
import windowSize from "window-size"
import {$} from "zx"
import { argParse } from "../api/arguments.js"
import Ffmpeg from "../api/ffmpeg.js"

const hwaccelPreset = new Option("-p, --hwaccel-preset <number>", "Set a hardware acceleration preset.").choices([
    "vaapi",
])

const program = new Command("ffgif")
    .description("Convert any video file to gif without losing significant quality")
    .argument("<input>", "Path to input video")
    .argument("[output]", "Path to output gif. (optional)")
    .option("--threads <number>", "Number of threads to use when transcoding.", argParse("int"), 4)
    .addOption(hwaccelPreset)
    .option("--debug", "Prints the debug info")
    .configureHelp({ helpWidth: windowSize?.get()?.width })
    .action(async (input, output, options) => {
        const videoExists = (await $`[[ -f ${input} ]]`.exitCode) === 0

        if (!input) {
            console.error("Please provide a path to a video")
            process.exit(1)
        } else if (!videoExists) {
            console.error("Provided path doesn't exists")
            process.exit(1)
        }

        console.log(`Input video path: ${chalk.cyan(input)}`)

        if (!output) {
            const inputPathSplit = input.split(".")
            inputPathSplit.splice(inputPathSplit.length - 1, 1, "x265.mkv")
            output = inputPathSplit.join(".")
        }

        if (options.hwaccelPreset === "vaapi") {
            const hwaccelFlags = [
                "-hwaccel",
                "-vaapi",
                "-vaapi_device",
                "/dev/dri/renderD128",
                "-vf",
                "format=nv12,hwupload",
            ]
            const ffmpegProcess = $`ffmpeg -hide_banner -i ${input} ${hwaccelFlags} -c:v hevc_vaapi -c:a copy ${output}`
            await Ffmpeg.progress(ffmpegProcess)
        } else {
            const ffmpegProcess = $`ffmpeg -hide_banner -i ${input} -threads ${options.threads} -c:v libx265 -c:a copy ${output}`
            await Ffmpeg.progress(ffmpegProcess)
        }
    })

program.parse()
