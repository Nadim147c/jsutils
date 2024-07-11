#!/usr/bin/env zx

import "zx/globals"
import Ffmpeg from "../api/ffmpeg.js"
import Help from "../api/help.js"

const argv = minimist(process.argv.slice(3), {
    string: ["ratio"],
    alias: { help: ["h"], preview: ["p"] },
    boolean: ["help", "preview", "debug"],
})

if (argv.help) {
    const helper = new Help("Usage: crop-video [OPTIONS] INPUT [OUTPUT]")
    helper.argument("INPUT", "Path to input video").argument("OUTPUT", "Path to output video. (optional)")
    helper
        .option(
            "--ratio ASPECT_RATIO",
            "Use a ratio instead of auto detect to crop. (ex: --ratio 1/2, --ratio 18*9, --ratio 16:9)"
        )
        .option("--white", "Auto detect white bar instead of black to crop")
        .option("--top PIXEL", "Number of pixel to add to the top after calculating the crop")
        .option("--bottom PIXEL", "Number of pixel to add to the bottom after calculating the crop")
        .option("--right PIXEL", "Number of pixel to add to the right after calculating the crop")
        .option("--left PIXEL", "Number of pixel to add to the left after calculating the crop")
        .option("--around PIXEL", "Number of pixel to add to the around after calculating the crop")
        .option("--threads NUMBER", "Number of threads to use when transcoding. Default is 4")
        .option("--preview", "Show a preview of the crop instead of outputting it")
        .option("-h, --help", "Prints the help menu")
        .option("--debug", "Prints the debug info")

    helper.print()

    process.exit(0)
}

if (argv.debug) console.log(argv)

const videoPath: string | undefined = argv.i ?? argv._?.[0]

if (!videoPath) {
    console.log(chalk.red("Please provide a path to a video"))
    process.exit(1)
}

const videoExists = (await $`[[ -f ${videoPath} ]]`.exitCode) === 0
if (!videoExists) {
    console.log(chalk.red("Provided path doesn't exists"))
    process.exit(1)
}

console.log(`Input video path: ${chalk.cyan(videoPath)}`)

const ffprobeProcess = $`ffprobe -v error -select_streams v:0 -show_entries format=duration -show_entries stream=width,height -of json ${videoPath}`
const ffprobeInfo = await spinner("Retrieving height and width", () => ffprobeProcess)

const ffprobeJson = JSON.parse(ffprobeInfo.stdout)

if (!ffprobeJson.streams.length) {
    console.log(chalk.red("Failed to find any video stream on input path"))
    process.exit(1)
}

const videoWidth = ffprobeJson.streams[0].width as number
const videoHeight = ffprobeJson.streams[0].height as number

class Crop {
    w: number
    h: number
    x: number
    y: number

    constructor(w: string | number, h: string | number, x: string | number, y: string | number) {
        this.w = typeof w === "string" ? parseInt(w) : w
        this.h = typeof h === "string" ? parseInt(h) : h
        this.x = typeof x === "string" ? parseInt(x) : x
        this.y = typeof y === "string" ? parseInt(y) : y
    }

    left(amount: number) {
        amount = this.x - amount < 0 ? this.x : amount
        this.x -= amount
        this.w += amount
    }

    right(amount: number) {
        amount = this.w + amount > videoWidth - this.x ? videoWidth - this.x : amount
        this.w += amount
    }

    top(amount: number) {
        amount = this.y - amount < 0 ? this.y : amount
        this.y -= amount
        this.h += amount
    }

    bottom(amount: number) {
        amount = this.h + amount > videoHeight - this.y ? videoHeight - this.y : amount
        this.h += amount
    }

    toString() {
        const { w, h, x, y } = this
        return `crop=${w}:${h}:${x}:${y}`
    }
}

let crop: Crop

if (argv.ratio) {
    const [cropWidth, cropHeight] = argv.ratio.split(/\/|x|:/).map(parseFloat)

    const rw = videoWidth / cropWidth
    const rh = videoHeight / cropHeight
    const ratio = Math.min(rw, rh)

    const newWidth = Math.round(ratio * cropWidth)
    const newHeight = Math.round(ratio * cropHeight)

    const x = Math.round((videoWidth - newWidth) / 2)
    const y = Math.round((videoHeight - newHeight) / 2)

    crop = new Crop(newWidth, newHeight, x, y)
} else {
    const detectionTime = argv.dt || 2
    const filter = `eq=contrast=1.8,${argv.white ? "negate," : ""}cropdetect`

    const command = $`ffmpeg -i ${videoPath} -t ${detectionTime} -vf ${filter} -f null - 2>&1 | tail | awk '/crop/ { print $NF }'`

    const detection = await spinner("Deteccting crop from video using ffmpeg...", () => command)
    const detectedCrop = detection.lines().at(0)?.slice(5).split(":") as string[]
    const [w, h, x, y] = detectedCrop

    crop = new Crop(w, h, x, y)
}

if (typeof argv.top === "number") crop.top(argv.top)
if (typeof argv.bottom === "number") crop.bottom(argv.bottom)
if (typeof argv.right === "number") crop.right(argv.right)
if (typeof argv.left === "number") crop.left(argv.left)
if (typeof argv.around === "number") {
    crop.top(argv.around)
    crop.bottom(argv.around)
    crop.right(argv.around)
    crop.left(argv.around)
}

let outputPath = argv.o ?? argv._?.[1]
if (!outputPath) {
    const inputPathSplit = videoPath.split(".")
    inputPathSplit.splice(inputPathSplit.length - 1, 0, `${crop.w}x${crop.h}`)
    outputPath = inputPathSplit.join(".")
}

if (argv.preview) {
    const previewRatio = Math.max(crop.w, crop.h) / 500
    const filter = `${crop},scale=${Math.round(crop.w / previewRatio)}:${Math.round(crop.h / previewRatio)}`
    await $`ffplay -i ${videoPath} -hide_banner -vf ${filter}`.quiet(true)
} else {
    if (argv.debug) console.log(crop)

    const ffmpegProgress = $`ffmpeg -i ${videoPath} -threads ${argv.threads ?? 4} -vf ${crop} ${outputPath} 2>&1`
    await Ffmpeg.progress(ffmpegProgress, [])
}
