import logUpdate from "log-update"

export default class Ffmpeg {
    constructor() {}

    /**
     * @param {import("zx").ProcessPromise} ffmpegProcess Standard output
     * @param {string[]} args Parsed arguments of process
     */
    async progress(ffmpegProcess, args = process.argv) {
        let totalFrames
        let streamFPS = this.parseFrameRateFromArgv(args)
        let duration = this.parseDurationFromArgv(args)

        for await (const chunk of ffmpegProcess.stdout) {
            /** @type {string} */
            const data = chunk.toString()

            const OVERWRITE_REGEX = /File .+ already exists\. Overwrite\? \[y\/N\]/
            const overwrite = data.match(OVERWRITE_REGEX)
            if (overwrite) {
                const str = overwrite.at(0)?.trim()
                process.stdout.write(`${str} `)
                continue
            }

            const DURATION_REGEX = /Duration: *(\d\d:\d\d:\d\d.\d\d)/
            if (!duration) duration = data.match(DURATION_REGEX)?.[1]

            const FPS_REGEX = /(\d{2}\.\d{2}|\d{2}) fps/
            if (!streamFPS) {
                const fpsMatch = data.match(FPS_REGEX)?.at(1)
                if (fpsMatch) streamFPS = parseFloat(fpsMatch)
            }

            if (duration && streamFPS && !totalFrames) {
                // prettier-ignore
                const seconds = this.durationToSeconds(duration)
                totalFrames = seconds * streamFPS
            }

            const PROGRESS_REGEX = /frame= *(\d+) *fps= *(\d+).*speed=(\d+|\d+\.\d+)x/i
            const ffmpegProgress = data.match(PROGRESS_REGEX)

            if (!ffmpegProgress || !totalFrames || !streamFPS) continue

            const frames = parseFloat(ffmpegProgress[1])
            const fps = parseFloat(ffmpegProgress[2])
            const speed = parseFloat(ffmpegProgress[3])

            const etaSec = (totalFrames - frames) / streamFPS / speed ?? 0
            const eta = new Date(etaSec * 1000).toISOString().substring(11, 22)

            const percentage = Math.round((frames / totalFrames) * 100)

            const barSize = Math.round((process.stdout.columns || 80) * 0.3)

            const barCompleteCount = Math.round((barSize * percentage) / 100)
            const barComplete = chalk.green("━".repeat(barCompleteCount))
            const barIncomplete = chalk.grey("━".repeat(barSize - barCompleteCount))
            const bar = barComplete + barIncomplete

            const framesFormat = `Frames: ${chalk.blue(`${frames}/${totalFrames}`)}`
            const fpsFormat = `FPS: ${chalk.green(fps)}`
            const speedFormat = `Speed: ${chalk.magenta(`${speed}x`)}`
            const etaFormat = `ETA: ${chalk.cyan(eta)}`

            logUpdate(`${chalk.bold("ffmpeg")}: ${bar} ${framesFormat} ${fpsFormat} ${speedFormat} ${etaFormat}`)
        }

        logUpdate.done()
    }

    /**
     * @param {string[]} args minimist parsed arguments
     * @returns {number|undefined} Parsed fps
     */
    parseFrameRateFromArgv(args) {
        let inputFPS

        const fpsMaxIndex = args.indexOf("-fpsmax")
        if (fpsMaxIndex !== -1) inputFPS = args.at(fpsMaxIndex + 1)

        const fpsIndex = args.indexOf("-r")
        if (fpsIndex !== -1) inputFPS = args.at(fpsIndex + 1)

        const filterGraphIndex = args.indexOf("-vf")
        if (filterGraphIndex !== -1) {
            const filterGraph = args.at(filterGraphIndex + 1)
            if (filterGraph && filterGraph.includes("fps=")) inputFPS = filterGraph.match(/fps=(\d+)/)?.at(1)
        }

        const filterComplexIndex = args.indexOf("-filter_complex")
        if (filterComplexIndex !== -1) {
            const filterComplex = args.at(filterComplexIndex + 1)
            if (filterComplex && filterComplex.includes("fps=")) inputFPS = filterComplex.match(/fps=(\d+)/)?.at(1)
        }

        if (!inputFPS) return

        if (typeof inputFPS === "number") return inputFPS

        if (!isNaN(parseFloat(inputFPS))) {
            return parseFloat(inputFPS)
        }

        if (inputFPS.includes("/")) {
            const parts = inputFPS.split("/")
            if (parts.length === 2 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1]))) {
                return parseFloat(parts[0]) / parseFloat(parts[1])
            }
        }

        const frameRateAbbreviations = {
            ntsc: 30000 / 1001,
            pal: 25,
        }
        const abbreviation = inputFPS.toLowerCase()
        if (abbreviation in frameRateAbbreviations) {
            // @ts-ignore
            return frameRateAbbreviations[abbreviation]
        }
    }

    /**
     * @param {string | number} duration Duration value
     * @returns {number} Parsed duration in seconds
     */
    durationToSeconds(duration) {
        if (typeof duration === "number") return duration
        const pieces = duration.split(":").reverse()
        let seconds = 0
        for (let i = 0; i < pieces.length; i++) {
            seconds += parseFloat(pieces[i]) * 60 ** i
        }
        return seconds
    }

    /**
     * @param {string[]} args Parsed arguments by minimist
     * @returns {string | undefined} Parse duration from arguments
     */
    parseDurationFromArgv(args) {
        const timeIndex = args.indexOf("-t")
        if (timeIndex !== -1) return args.at(timeIndex + 1)

        const toIndex = args.indexOf("-to")
        if (toIndex !== -1) {
            if (toIndex === -1 || !args.at(toIndex + 1)) return
            const duration = args.at(toIndex + 1)

            const startIndex = args.indexOf("-ss")
            if (startIndex === -1 || !args.at(startIndex + 1)) return duration

            const start = args.at(startIndex + 1)
            if (start && duration) return (this.durationToSeconds(duration) - this.durationToSeconds(start)).toString()
        }
    }
}
