#!/usr/bin/env zx
"use strict"

import "zx/globals"
import Help from "../api/help.js"

const argv = minimist(process.argv.slice(3), {
    alias: { help: ["h"] },
    boolean: ["help"],
})

if (argv.help) {
    const helper = new Help("Usage: help_command | cm")
    helper.option("-h, --help", "Prints the help menu")
    helper.print()
    process.exit(0)
}

const stdinContent = await stdin()

const input = stdinContent
    .split("\n")
    .map((line, i) => `${i + 1} ${line}`)
    .join("\n")

const env = process.env
env.CONTENT = stdinContent

const $$ = $({ input, env, nothrow: true })
const lineNumber =
    await $$`fzf --border-label 'Fuzzy Help Reader' --preview-label 'Grep Preview' --preview='echo $CONTENT | tail -n +{1} | cm' | cut -d ' ' -f1`

if (!lineNumber.stdout.trim()) process.exit(0)

const cut = await $({ input: stdinContent })`tail -n ${`+${lineNumber.stdout.trim()}`} | head -n 20 | cm`

console.log(cut.stdout)
