#!/usr/bin/env bun

import { readdir } from "fs-extra"

const fileName = process.argv.at(2)
async function build(entryPoint: string) {
    console.log("Building", entryPoint)

    await Bun.build({
        entrypoints: [entryPoint],
        outdir: "bin",
        naming: `[name]`,
        external: ["zx"],
        target: "bun",
        minify: true,
        sourcemap: "inline",
    })
}

if (fileName && !fileName.includes("src/api")) {
    await build(fileName)
    process.exit(0)
}

const dirs = await readdir(`${__dirname}/src/`)

dirs.filter((dirname) => dirname !== "api").forEach(async (dirname) => {
    for (const file of await readdir(`${__dirname}/src/${dirname}`)) {
        await build(`${__dirname}/src/${dirname}/${file}`)
    }
})
