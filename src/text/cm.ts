#!/usr/bin/env zx

import { Chalk } from "chalk"
import "zx/globals"
import Help from "../api/help.js"

const argv = minimist(process.argv.slice(3), {
    alias: { help: ["h"] },
    boolean: ["help"],
})

if (argv.help) {
    const helper = new Help("Usage: help_command | fm")
    helper.option("-h, --help", "Prints the help menu")
    echo($({ input: helper.toString(), sync: true })`cm`)
    process.exit(0)
}

const input = await stdin()

// Highlight Headers
const content = await $({ input })`sed -r 's/^(\\s*[A-Z].*:\\s*)$/\\x1B[31m\\1\\x1B[39m/'`.text()

const c = new Chalk({ level: 3 })

const preview = content
    // Highlight Headers
    // .replace(/^(\s*[A-Z]\w*:\s*)$/g, (res) => chalk.red(res)) // Doesn't works cuz js regex sucks
    // Highlight options [-something|--some-thing]
    .replace(/\s+-?(-\w+){1,5}/g, (res: string) => c.cyanBright(res))
    // Highlight option capitalized valoe [-o VALUE]
    .replace(/(?<=(.*-?(-\w+){1,5}.*(\s*|=)))([A-Z_\]\[:\s]+\s\s+)/g, (res) => c.yellowBright(res))

console.log(preview)
