#!/usr/bin/env node

import { Command, InvalidOptionArgumentError, Option } from "@commander-js/extra-typings"
import { join } from "path"
import windowSize from "window-size"
import "zx/globals"

function typeParse(value: string, previous: string[]) {
    const typeMap = value.split(":")
    if (typeMap.length !== 2) throw new InvalidOptionArgumentError("Invalid type mapping")
    return previous.concat([value])
}

const typeMapOption = new Option("-t, --type-map <Extension:Type...>", "Map addional type or overright existion type.")
    .default([], "None")
    .argParser(typeParse)

const program = new Command("organize-files")
    .argument("<DIRECTORY>", "Directory you want to organize")
    .addOption(typeMapOption)
    .option("--debug", "print debug info")
    .configureHelp({ helpWidth: windowSize.get()?.width })
    .action(async (directory, options) => {
        if (options.debug) console.log({ directory, options })

        const fileTypes = new Map<string, string>()

        const defaultTypes = {
            Image: ["png", "jpg", "jpeg", "svg", "ico", "gif", "webp"],
            Video: ["mp4", "mkv", "webm"],
            Audio: ["mp3", "wav", "m4a", "flac"],
            Document: ["pdf", "txt", "md", "html"],
            Script: ["js", "ts", "py"],
            Archive: ["tar", "gz", "zip", "rar"],
            Torrent: ["torrent"],
        }

        // I can do worse than python devs
        for (const [t, exts] of Object.entries(defaultTypes)) for (const e of exts) fileTypes.set(e, t)
        for (const t of options.typeMap) fileTypes.set(...(t.split(":") as [string, string]))

        if (options.debug) console.log(fileTypes)

        const files = await fs.readdir(directory)

        for (const file of files) {
            const extension = file.split(".").at(-1) ?? ""
            const fileType = fileTypes.get(extension) ?? "Other"

            const pasteDir = join(directory, fileType)
            const filePath = join(directory, file)

            if ((await $`[[ ! -d ${pasteDir} ]]`.exitCode) === 0) await $`mkdir -p ${pasteDir}`
            if ((await $`[[ ! -f ${filePath} ]]`.exitCode) === 0) continue

            const out = await $`mv -v ${filePath} ${pasteDir}`.nothrow()
            echo(out)
        }
    })

program.parse()
