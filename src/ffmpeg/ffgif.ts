#!/usr/bin/env node

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

        const ffprobeProcess = $`ffprobe -v error -select_streams v:0 -show_entries format=duration -show_entries stream=width,height -of json ${input}`
        const ffprobeInfo = await spinner("Retrieving height and width", () => ffprobeProcess)

        const ffprobeJson = JSON.parse(ffprobeInfo.stdout)

        if (!ffprobeJson.streams.length) {
            console.log(chalk.red("Failed to find any video stream on input path"))
            process.exit(1)
        }

        const videoWidth: number = ffprobeJson.streams[0].width
        const videoHeight: number = ffprobeJson.streams[0].height

        const palette = `${crypto.randomUUID()}.png`
        const palettegenProcess = $`ffmpeg -i ${input} -vf palettegen -threads ${options.threads} ${palette}`.quiet()
        await spinner("Generating palette for gif...", () => palettegenProcess)

        if (!output) {
            const inputPathSplit = input.split(".")
            inputPathSplit.splice(inputPathSplit.length - 1, 1, "gif")
            output = inputPathSplit.join(".")
        }

        const filterGraph = `fps=10,scale=${videoWidth}:${videoHeight}[x];[x][1:v]paletteuse`

        if (options.preview) {
            await $`ffplay -i ${input} -i ${palette} -loop ${options.loop} -filter_complex ${filterGraph}`.quiet()
        } else {
            const ffmpegProcess = $`ffmpeg -i ${input} -i ${palette} -loop ${options.loop} -threads ${options.threads} -filter_complex ${filterGraph} ${output} 2>&1`
            await Ffmpeg.progress(ffmpegProcess, ["-filter_complex", filterGraph])
            await rm(palette)
        }
    })

program.parse()
