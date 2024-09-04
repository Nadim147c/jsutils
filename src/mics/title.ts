#!/usr/bin/env bun

import { Command } from "@commander-js/extra-typings"
import windowSize from "window-size"
import "zx/globals"
import Terminal from "../api/terminal.js"

const program = new Command("title")
    .description("Set the title of the terminal.")
    .allowUnknownOption()
    .configureHelp({ helpWidth: windowSize?.get()?.width })
    .action(async () => {
        let title = process.argv.slice(2).join().trim()

        if (!title) title = await question("What will be the title of terminal? ")

        Terminal.setTitle(title)
    })

program.parse()
