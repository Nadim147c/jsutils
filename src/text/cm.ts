#!/usr/bin/env node

import { Command } from "@commander-js/extra-typings"
import { Chalk } from "chalk"
import windowSize from "window-size"
import "zx/globals"

const program = new Command("cm")
    .description("This parser uses regex and mostly inacurate. Consider using 'bat -pl help'")
    .configureHelp({ helpWidth: windowSize?.get()?.width })
    .action(async () => {
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
    })

program.parse()
