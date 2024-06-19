#!/usr/bin/env zx

import crypto from "crypto"
import { rm } from "fs/promises"
import "zx/globals"
import Ffmpeg from "../api/ffmpeg.js"
import Help from "../api/help.js"

const exit = process.exit

const argv = minimist(process.argv.slice(3), {
    string: ["ratio"],
    alias: { help: ["h"], preview: ["p"] },
    boolean: ["help", "preview", "debug"],
})

if (argv.help) {
    const helper = new Help("Usage: crop-video [OPTIONS] INPUT [OUTPUT]")
    helper.argument("INPUT", "Path to input video").argument("OUTPUT", "Path to output gif. (optional)")
    helper
        .option("--threads NUMBER", "Number of threads to use when transcoding. Default is 4")
        .option("--loop NUMBER", "Number of time gif will loop. Default is 0 meaning infinite loop.")
        .option("--preview", "Show a preview of the crop instead of outputting it")
        .option("-h, --help", "Prints the help menu")
        .option("--debug", "Prints the debug info")

    echo($({ input: helper.toString(), sync: true })`cm`)
    exit(0)
}

if (argv.debug) console.log(argv)

/** @type {string} */
const videoPath = argv.i ?? argv._?.[0]
const videoExists = (await $`[[ -f ${videoPath} ]]`.exitCode) === 0

if (!videoPath) {
    console.log(chalk.red("Please provide a path to a video"))
    exit(1)
} else if (!videoExists) {
    console.log(chalk.red("Provided path doesn't exists"))
    exit(1)
}

console.log(`Input video path: ${chalk.cyan(videoPath)}`)

const ffprobeProcess = $`ffprobe -v error -select_streams v:0 -show_entries format=duration -show_entries stream=width,height -of json ${videoPath}`
const ffprobeInfo = await spinner("Retrieving height and width", () => ffprobeProcess)

const ffprobeJson = JSON.parse(ffprobeInfo.stdout)

if (!ffprobeJson.streams.length) {
    console.log(chalk.red("Failed to find any video stream on input path"))
    exit(1)
}

/** @type {number} */
const videoWidth = ffprobeJson.streams[0].width

/** @type {number} */
const videoHeight = ffprobeJson.streams[0].height

const palette = `${crypto.randomUUID()}.png`
const palettegenProcess = $`ffmpeg -i ${videoPath} -vf palettegen -threads ${argv.threads ?? 4} ${palette}`.quiet()
await spinner("Generating palette for gif...", () => palettegenProcess)

let outputPath = argv.o ?? argv._?.[1]
if (!outputPath) {
    const inputPathSplit = videoPath.split(".")
    inputPathSplit.splice(inputPathSplit.length - 1, 1, "gif")
    outputPath = inputPathSplit.join(".")
}

const filterGraph = `fps=10,scale=${videoWidth}:${videoHeight}[x];[x][1:v]paletteuse`

if (argv.preview) {
    await $`ffplay -i ${videoPath} -i ${palette} -loop ${argv.loop ?? 0} -filter_complex ${filterGraph}`.quiet()
} else {
    const ffmpegProcess = $`ffmpeg -i ${videoPath} -i ${palette} -loop ${argv.loop ?? 0} -threads ${argv.threads ?? 4} -filter_complex ${filterGraph} ${outputPath} 2>&1`
    await Ffmpeg.progress(ffmpegProcess, ["-filter_complex", filterGraph])
    await rm(palette)
}
