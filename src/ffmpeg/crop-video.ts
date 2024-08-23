#!/usr/bin/env node

import { Command, Option } from "@commander-js/extra-typings"
import windowSize from "window-size"
import "zx/globals"
import { argParse } from "../api/arguments.js"
import Ffmpeg from "../api/ffmpeg.js"

const ratioOption = new Option(
    "-r, --ratio <aspect_ratio>",
    "Use a ratio instead of auto detect to crop. (ex: --ratio 1/2, --ratio 18*9, --ratio 16:9)"
).conflicts(["white", "detectionTime"])
const program = new Command("crop-video")
    .argument("<input>", "Path to input video")
    .argument("[output]", "Path to output video. (optional)")
    .option("--white", "Auto detect white bar instead of black to crop")
    .addOption(ratioOption)
    .option("--top <pixel>", "Number of pixel to add to the top after calculating the crop", argParse("int"))
    .option("--bottom <pixel>", "Number of pixel to add to the bottom after calculating the crop", argParse("int"))
    .option("--right <pixel>", "Number of pixel to add to the right after calculating the crop", argParse("int"))
    .option("--left <pixel>", "Number of pixel to add to the left after calculating the crop", argParse("int"))
    .option("--around <pixel>", "Number of pixel to add to the around after calculating the crop", argParse("int"))
    .option("--threads <number>", "Number of threads to use when transcoding.", argParse("int"), 4)
    .option("-dt, --detection-time <time>", "Number of seconds to detect the video for crop.", "2")
    .option("--preview", "Show a preview of the crop instead of outputting it")
    .option("--debug", "Prints the debug info")
    .configureHelp({ helpWidth: windowSize?.get()?.width })
    .action(async (input, output, options) => {
        if (options.debug) console.log(options)

        if (!input) {
            console.error("Please provide a path to a video")
            process.exit(1)
        }

        const videoExists = (await $`[[ -f ${input} ]]`.exitCode) === 0
        if (!videoExists) {
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

        const videoWidth = ffprobeJson.streams[0].width as number
        const videoHeight = ffprobeJson.streams[0].height as number

        class Crop {
            w: number
            h: number
            x: number
            y: number

            constructor(w: string | number, h: string | number, x: string | number, y: string | number) {
                this.w = typeof w === "number" ? w : parseInt(w)
                this.h = typeof h === "number" ? h : parseInt(h)
                this.x = typeof x === "number" ? x : parseInt(x)
                this.y = typeof y === "number" ? y : parseInt(y)
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

        if (options.ratio) {
            const [cropWidth, cropHeight] = options.ratio.split(/\/|x|:/).map(parseFloat)

            const rw = videoWidth / cropWidth
            const rh = videoHeight / cropHeight
            const ratio = Math.min(rw, rh)

            const newWidth = Math.round(ratio * cropWidth)
            const newHeight = Math.round(ratio * cropHeight)

            const x = Math.round((videoWidth - newWidth) / 2)
            const y = Math.round((videoHeight - newHeight) / 2)

            crop = new Crop(newWidth, newHeight, x, y)
        } else {
            const detectionTime = options.detectionTime
            const filter = `eq=contrast=1.8,${options.white ? "negate," : ""}cropdetect`

            const command = $`ffmpeg -i ${input} -t ${detectionTime} -vf ${filter} -f null - 2>&1 | tail | awk '/crop/ { print $NF }'`

            const detection = await spinner("Deteccting crop from video using ffmpeg...", () => command)
            const detectedCrop = detection.lines().at(0)?.slice(5).split(":") as string[]
            const [w, h, x, y] = detectedCrop

            crop = new Crop(w, h, x, y)
        }

        if (options.top) crop.top(options.top)
        if (options.bottom) crop.bottom(options.bottom)
        if (options.right) crop.right(options.right)
        if (options.left) crop.left(options.left)

        if (options.around) {
            crop.top(options.around)
            crop.bottom(options.around)
            crop.right(options.around)
            crop.left(options.around)
        }

        if (!output) {
            const inputPathSplit = input.split(".")
            inputPathSplit.splice(inputPathSplit.length - 1, 0, `${crop.w}x${crop.h}`)
            output = inputPathSplit.join(".")
        }

        if (options.preview) {
            const previewRatio = Math.max(crop.w, crop.h) / 500
            const filter = `${crop},scale=${Math.round(crop.w / previewRatio)}:${Math.round(crop.h / previewRatio)}`
            await $`ffplay -i ${input} -hide_banner -vf ${filter}`.quiet(true)
        } else {
            if (options.debug) console.log(crop)

            const ffmpegProgress = $`ffmpeg -i ${input} -threads ${options.threads} -vf ${crop} ${output} 2>&1`
            await Ffmpeg.progress(ffmpegProgress, [])
        }
    })

program.parse()
