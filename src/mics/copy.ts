#!/usr/bin/env zx

import "zx/globals"
import Help from "../api/help.js"
import Terminal from "../api/terminal.js"

const argv = minimist(process.argv.slice(3), {
    alias: { help: ["h"] },
    boolean: ["help"],
})

if (argv.help) {
    const helper = new Help("Usage: 'command | copy' 'copy text'")
    helper.option("-h, --help", "Prints the help menu")
    helper.print()
    process.exit(0)
}

let text = process.argv.slice(3).join().trim()
if (!text) text = await stdin()

Terminal.copy(text)
