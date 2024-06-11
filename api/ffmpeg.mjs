import logUpdate from "log-update"

export default class Ffmpeg {
    constructor() {}

    /**
     * @param {import("zx").ProcessPromise} ffmpegProcess Standard output
     */
    static async progress(ffmpegProcess) {
        let totalFrames
        let streamFPS
        let duration

        for await (const chunk of ffmpegProcess.stdout) {
            /** @type {string} */
            const data = chunk.toString()

            const OVERWRITE_REGEX = /File .+ already exists\. Overwrite\? \[y\/N\]/
            const overwrite = data.match(OVERWRITE_REGEX)
            if (overwrite) {
                const str = overwrite.at(0).trim()
                process.stdout.write(`${str} `)
                continue
            }

            const DURATION_REGEX = /Duration: *(\d\d:\d\d:\d\d.\d\d)/
            if (!duration) duration = data.match(DURATION_REGEX)?.[1]

            const FPS_REGEX = /(\d{2}\.\d{2}|\d{2}) fps/
            if (!streamFPS) streamFPS = data.match(FPS_REGEX)?.[1]

            if (duration && streamFPS && !totalFrames) {
                const convertToSec = (a, c, i) => a + c * 60 ** i
                // prettier-ignore
                const seconds = duration.split(":").map((x) => parseFloat(x)).reverse().reduce(convertToSec, 0)
                totalFrames = seconds * parseFloat(streamFPS)
            }

            const PROGRESS_REGEX = /frame= *(\d+) *fps= *(\d+).*speed=(\d+|\d+\.\d+)x/i
            const ffmpegProgress = data.match(PROGRESS_REGEX)

            if (!ffmpegProgress || !totalFrames) continue

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
}
