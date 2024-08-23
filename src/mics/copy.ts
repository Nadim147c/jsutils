#!/usr/bin/env node

import "zx/globals"
import Terminal from "../api/terminal.js"
import { Command } from "@commander-js/extra-typings"
import windowSize from "window-size"

const program = new Command("copy")
    .description("Copy any string using ANSI escape sequance.")
    .configureHelp({ helpWidth: windowSize?.get()?.width })
    .action(async () => {
        let text = process.argv.slice(2).join().trim()
        if (!text) text = await stdin()
        Terminal.copy(text)
    })

program.parse()
