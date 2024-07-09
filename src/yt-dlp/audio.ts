#!/usr/bin/env zx

import os from "os"
import { z } from "zod"
import "zx/globals"
import Arguments from "../api/arguments.js"
import Help from "../api/help.js"

const exts = [
    z.literal("aac"),
    z.literal("alac"),
    z.literal("flac"),
    z.literal("m4a"),
    z.literal("mp3"),
    z.literal("opus"),
    z.literal("vorbis"),
    z.literal("wav"),
] as const
const args = new Arguments({
    _: z.array(z.string()).min(1, "Missing argument URL. Please provide an url."),
    __: z.array(z.string()).optional(),
    ext: z.union(exts).default("mp3"),
    section: z.string().optional(),
    cookies: z.string().optional(),
    browser: z.string().optional(),
    threads: z.number().int().min(1).default(1),
    sponsorblock: z.boolean(),
    help: z.boolean().optional(),
    debug: z.boolean().optional(),
})

const helper = new Help("Usage: video [OPTIONS] URL")
helper.argument("URL", "url of the video to download")
helper
    .option("--section REGEX", "Section of the video to download. Timestamp must start with * (ex: '*0.11-0.50')")
    .option("-c, --cookies FILE", "Netscape formatted file to read cookies from and dump cookie jar in")
    .option("--browser BROWSER", "Name of the browser to use cookies from")
    .option("--threads NUMBER", "Number of concurrent downloads. Default is 1")
    .option("--no-sponsorblock", "Disable sponsorblock for downloaded video. Default is on")
    .option("-h, --help", "Prints the help menu")
    .option("--debug", "Prints the debug info")

const argv = args.parse(helper, {
    alias: { h: "help" },
    boolean: ["help", "sponsorblock", "debug"],
    default: { sponsorblock: true },
})

if (typeof argv.sponsorblock === "undefined") argv.sponsorblock = true
if (typeof argv.threads === "undefined") argv.threads = 1

if (argv.debug) console.log(argv)

const outputTemplate = `${os.homedir()}/Downloads/Audio/%(title)s-%(id)s.%(ext)s`

const format = "beataudio/best"

const ytDlpArgs = [
    "--extract-audio",
    "--no-playlist",
    "--audio-quality=0",
    `--format=${format}`,
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
