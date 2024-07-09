#!/usr/bin/env zx

import os from "os"
import { z } from "zod"
import "zx/globals"
import Arguments from "../api/arguments.js"
import Help from "../api/help.js"

const exts = [
    z.literal("mp4"),
    z.literal("avi"),
    z.literal("flv"),
    z.literal("mkv"),
    z.literal("mov"),
    z.literal("webm"),
] as const
const args = new Arguments({
    _: z.array(z.string()).min(1, "Missing argument URL. Please provide an url."),
    __: z.array(z.string()).optional(),
    format: z.string().optional(),
    section: z.string().optional(),
    cookies: z.string().optional(),
    browser: z.string().optional(),
    resolution: z.number().int().optional(),
    threads: z.number().int().default(1),
    sponsorblock: z.boolean().default(true),
    ext: z.union(exts).default("mp4"),
    help: z.boolean().optional(),
    debug: z.boolean().optional(),
})

const helper = new Help("Usage: video [OPTIONS] URL")
helper.argument("URL", "url of the video to download")
helper
    .option("-f, --format", "yt-dlp format. Default best with 1080p. You can use -r to set resolution.")
    .option("-r, --resolution", "Resolution to download video. Use -f=null for maximum resolution")
    .option("--section REGEX", "Section of the video to download. Timestamp must start with * (ex: '*0.11-0.50')")
    .option("-c, --cookies FILE", "Netscape formatted file to read cookies from and dump cookie jar in")
    .option("--browser BROWSER", "Name of the browser to use cookies from")
    .option("--ext FORMAT", "Containers that may be used when merging format")
    .option("--threads NUMBER", "Number of concurrent downloads. Default is 1")
    .option("--no-sponsorblock", "Disable sponsorblock for downloaded video. Default is on")
    .option("-h, --help", "Prints the help menu")
    .option("--debug", "Prints the debug info")

const argv = args.parse(helper, {
    alias: {
        h: "help",
        r: "resolution",
        f: "format",
        c: "cookie",
    },
    boolean: ["help", "sponsorblock", "debug"],
    default: { sponsorblock: true },
})

if (argv.debug) console.log(argv)

const outputTemplate = `${os.homedir()}/Downloads/Video/%(title)s-%(id)s.%(ext)s`

let format = "bv+ba/b"
if (argv.format === "null") {
    format = "bv+ba/b"
} else if (argv.format) {
    format = argv.format
} else if (!argv.resolution) {
    format = "bv[height<=1080]+ba/b[height<=1080]"
} else if (typeof argv.resolution === "number") {
    format = `bv[height<=${argv.resolution}]+ba/b[height<=${argv.resolution}]`
}
const ytDlpArgs = [
    `--format=${format}`,
    `--merge-output-format=${argv.ext}`,
    `--concurrent-fragments=${argv.threads}`,
    `--output=${outputTemplate}`,
    "--add-metadata",
    "--embed-chapters",
    "--list-formats",
    "--no-simulate",
    "--color=always",
]

if (argv.sponsorblock) ytDlpArgs.push("--sponsorblock-remove", "all")
if (argv.section) ytDlpArgs.push("--download-sections", argv.section)
if (argv.cookies) ytDlpArgs.push("--cookies", argv.cookies)
if (argv.browser) ytDlpArgs.push("--cookies-from-browser", argv.browser)

let url = argv._[0]

try {
    url = new URL(url).toString()
} catch (err) {
    url = `ytsearch:${url}`
}

await $`yt-dlp ${ytDlpArgs} ${url}`.verbose(true)
