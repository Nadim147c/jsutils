#!/usr/bin/env node

import { Command, Option } from "@commander-js/extra-typings"
import os from "os"
import windowSize from "window-size"
import "zx/globals"
import { argParse } from "../api/arguments.js"

const extOption = new Option("-e, --extension <container>", "Containers that may be used when merging format")
    .choices(["mp4", "avi", "flv", "mkv", "mov", "webm"])
    .default("mp4")
const resolutionOption = new Option(
    "-r, --resolution <number>",
    "resolution to download video. use -f=null for maximum resolution"
).argParser(argParse("int"))

const program = new Command("video")
    .description("Download video using yt-dlp of various sites")
    .argument("<URL>", "url or search term of the video you want to download")
    .option("-f, --format <format>", "yt-dlp format. default best with 1080p. you can use -r to set resolution")
    .addOption(resolutionOption)
    .option("--section <regex>", "section of the video to download. timestamp must start with * (ex: '*0.11-0.50')")
    .option("-c, --cookies <file>", "netscape formatted file to read cookies from and dump cookie jar in")
    .option("--browser <browser>", "name of the browser to use cookies from")
    .addOption(extOption)
    .option("--no-sponsorblock", "disable sponsorblock mark")
    .option("--playlist [playlist_index]", "use comma. range can be specified by [START]:[STOP][:STEP].")
    .option("--threads <number>", "number of concurrent downloads", argParse("int"), 4)
    .option("--debug", "prints the debug info")
    .configureHelp({ helpWidth: windowSize?.get()?.width })
    .action(async (url, options) => {
        if (options.debug) console.log(options)

        let outputTemplate = `${os.homedir()}/Downloads/Video/%(title)s-%(id)s.%(ext)s`
        if (options.playlist) outputTemplate = `${os.homedir()}/Downloads/Video/%(playlist)s/%(title)s-%(id)s.%(ext)s`

        let format
        if (options.format === "null") {
            format = "bv+ba/b"
        } else if (options.format) {
            format = options.format
        } else if (!options.resolution) {
            format = "(bv[height<=1080]+ba)/(b[height<=1080])/best"
        } else if (typeof options.resolution === "number") {
            format = `(bv[height<=${options.resolution}]+ba)/(b[height<=${options.resolution}])/best`
        } else {
            format = "bv+ba/b"
        }

        const ytDlpArgs = [
            `--format=${format}`,
            `--merge-output-format=${options.extension}`,
            `--concurrent-fragments=${options.threads}`,
            `--output=${outputTemplate}`,
            "--sponsorblock-mark=all",
            "--sub-langs=all",
            "--embed-subs",
            "--embed-thumbnail",
            "--embed-metadata",
            "--embed-chapters",
            "--list-formats",
            "--no-simulate",
            "--color=always",
        ]

        if (!options.sponsorblock) ytDlpArgs.push("--no-sponsorblock")
        if (options.section) ytDlpArgs.push("--download-sections", options.section)
        if (options.cookies) ytDlpArgs.push("--cookies", options.cookies)
        if (options.browser) ytDlpArgs.push("--cookies-from-browser", options.browser)
        if (options.playlist) ytDlpArgs.push("--yes-playlist", "--lazy-playlist")
        if (options.playlist && typeof options.playlist !== "boolean")
            ytDlpArgs.push(`--playlist-itmes=${options.playlist}`)

        try {
            url = new URL(url).toString()
        } catch (err) {
            url = `ytsearch:${url}`
        }

        await $`yt-dlp ${ytDlpArgs} ${url}`.verbose(true).nothrow()
    })

program.parse()
