#!/usr/bin/env bun

import { Command } from "@commander-js/extra-typings"
import windowSize from "window-size"
import "zx/globals"

const program = new Command("fm")
    .description(
        "Fuzzy manul finder. fm is a command for searching trough help command using fzf. It uses bat for syntex highlighing."
    )
    .configureHelp({ helpWidth: windowSize?.get()?.width })
    .action(async () => {
        const stdinContent = await stdin()

        const colorizedContent =
            $({ input: stdinContent, sync: true, nothrow: true })`bat --color=always -plhelp`?.toString() ||
            stdinContent

        const input = colorizedContent
            .split("\n")
            .map((line, i) => `${i + 1} ${line}`)
            .join("\n")

        const env = process.env
        env.CONTENT = colorizedContent

        const $$ = $({ input, env, nothrow: true })
        const fzfFlags = [
            "--ansi",
            "--no-sort",
            "--border-label=Fuzzy Help Reader",
            "--preview-label=Grep Preview",
            "--preview=echo $CONTENT | tail -n +{1}",
        ]
        const lineNumber = await $$`fzf ${fzfFlags} | cut -d ' ' -f1`

        if (!lineNumber.stdout.trim()) process.exit(0)

        const cut = await $({ input: colorizedContent })`tail -n ${`+${lineNumber.stdout.trim()}`} | head -n 20`

        console.log(cut.text())
    })

program.parse()
