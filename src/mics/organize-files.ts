#!/usr/bin/env zx

import "zx/globals"
import Help from "../api/help.js"
import { join } from "path"

const argv = minimist(process.argv.slice(3), {
    alias: { help: ["h"] },
    boolean: ["help"],
})

if (argv.help) {
    const helper = new Help("Usage: organize-files DIRECTORY")
    helper.argument("DIRECTORY", "Directory you want to organize")
    helper.option("-h, --help", "Prints the help menu")
    helper.print()
    process.exit(0)
}

const fileTypes = new Map<string, string>()

;["png", "jpg", "jpeg", "svg", "ico", "gif"].forEach((ext) => fileTypes.set(ext, "Image"))
;["mp4", "mkv"].forEach((ext) => fileTypes.set(ext, "Video"))
;["mp3", "wav", "m4a", "flac"].forEach((ext) => fileTypes.set(ext, "Audio"))
;["pdf", "txt", "md"].forEach((ext) => fileTypes.set(ext, "Document"))

const directory = argv._.at(0)

if (!directory) {
    console.log("Please provide a directory")
    process.exit(1)
}

const files = await $`ls ${directory}`

for (const file of files.lines()) {
    const extension = file.split(".").at(-1) ?? ""
    const fileType = fileTypes.get(extension) ?? "Other"

    const pasteDir = join(directory, fileType)
    const filePath = join(directory, file)

    if ((await $`[[ ! -d ${pasteDir} ]]`.exitCode) === 0) await $`mkdir -p ${pasteDir}`
    if ((await $`[[ ! -f ${filePath} ]]`.exitCode) === 0) continue

    console.log(`Copying ${filePath} to ${pasteDir}`)

    await $`mv ${filePath} ${pasteDir}`.nothrow()
}
