#!/usr/bin/env bun

import { Command, Option } from "@commander-js/extra-typings"
import crypto from "crypto"
import { rm } from "fs/promises"
import windowSize from "window-size"
import "zx/globals"
import { argParse } from "../api/arguments.js"
import Ffmpeg from "../api/ffmpeg.js"

const loopOption = new Option("--loop <number>", "Number of time gif will loop.")
    .argParser(argParse("int"))
    .default(0, "infinte")

const program = new Command("ffgif")
    .description("Convert any video file to gif without losing significant quality")
    .argument("<input>", "Path to input video")
    .argument("[output]", "Path to output gif. (optional)")
    .option("--threads <number>", "Number of threads to use when transcoding.", argParse("int"), 4)
    .addOption(loopOption)
    .option("--preview", "Show a preview of the crop instead of outputting it")
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

        const palette = `${crypto.randomUUID()}.png`
        const palettegenProcess = $``.quiet()
        await spinner("Generating palette for gif...", () => palettegenProcess)

        if (!output) {
            const inputPathSplit = input.split(".")
            inputPathSplit.splice(inputPathSplit.length - 1, 1, "gif")
            output = inputPathSplit.join(".")
        }

        const filterGraph = `fps=10[x];[x][1:v]paletteuse`

        if (options.preview) {
            await $`ffmpeg -hide_banner -i ${input} -vf palettegen -f image2pipe - | \
                    ffmpeg -hide_banner -i ${input} -i - -loop ${options.loop} -threads ${options.threads} -filter_complex ${filterGraph} -f gif - | \
                    ffplay -i - `
                .verbose()
                .nothrow()
        } else {
            // const ffmpegProcess = $`ffmpeg -i ${input} -vf palettegen -f image2pipe - | ffmpeg -i ${input} -i ${palette} -loop ${options.loop} -threads ${options.threads} -filter_complex ${filterGraph} ${output} 2>&1`
            // await Ffmpeg.progress(ffmpegProcess, ["-filter_complex", filterGraph])
        }
    })

program.parse()
