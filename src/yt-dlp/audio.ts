#!/usr/bin/env node

import { Command, Option } from "@commander-js/extra-typings"
import os from "os"
import windowSize from "window-size"
import "zx/globals"
import { argParse } from "../api/arguments.js"

const extOption = new Option("-e, --extension <container>", "Containers that may be used when merging format.")
    .choices(["aac", "alac", "flac", "m4a", "mp3", "opus", "vorbis", "wav"])
    .default("mp3")

const program = new Command("audio")
    .description("Download audio using yt-dlp of various sites.")
    .argument("<URL>", "url of the audio/video to download the audio")
    .option("--section <regex>", "Section of the audio to download. Timestamp must start with * (ex: '*0.11-0.50').")
    .option("-c, --cookies <file>", "Netscape formatted file to read cookies from and dump cookie jar in.")
    .option("--browser <browser>", "Name of the browser to use cookies from")
    .addOption(extOption)
    .option("--no-sponsorblock", "disable sponsorblock mark")
    .option("--playlist [playlist_index]", 'You can specify a range using "[START]:[STOP][:STEP]".')
    .option("--threads <number>", "Number of concurrent downloads.", argParse("int"), 4)
    .option("--debug", "Prints the debug info")
    .configureHelp({ helpWidth: windowSize?.get()?.width })
    .action(async (url, options) => {
        if (options.debug) console.log(options)

        let outputTemplate = `${os.homedir()}/Downloads/Video/%(title)s-%(id)s.%(ext)s`
        if (options.playlist) outputTemplate = `${os.homedir()}/Downloads/Video/%(playlist)s/%(title)s-%(id)s.%(ext)s`

        const ytDlpArgs = [
            "--extract-audio",
            "--no-playlist",
            "--audio-quality=0",
            `--format=ba/b`,
            `--audio-format=${options.extension}`,
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
