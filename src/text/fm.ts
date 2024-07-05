#!/usr/bin/env zx

import "zx/globals"
import Help from "../api/help.js"

const argv = minimist(process.argv.slice(3), {
    alias: { help: ["h"] },
    boolean: ["help"],
})

if (argv.help) {
    const helper = new Help("Usage: help_command | fm")
    helper.option("-h, --help", "Prints the help menu")
    helper.print()
    process.exit(0)
}

const stdinContent = await stdin()

const colorizedContent =
    $({ input: stdinContent, sync: true, nothrow: true })`bat --color=always -plhelp`?.toString() || stdinContent

const input = colorizedContent
    .split("\n")
    .map((line, i) => `${i + 1} ${line}`)
    .join("\n")

const env = process.env
env.CONTENT = colorizedContent

const $$ = $({ input, env, nothrow: true })
const lineNumber =
    await $$`fzf --ansi --border-label 'Fuzzy Help Reader' --preview-label 'Grep Preview' --preview='echo $CONTENT | tail -n +{1}' | cut -d ' ' -f1`

if (!lineNumber.stdout.trim()) process.exit(0)

const cut = await $({ input: colorizedContent })`tail -n ${`+${lineNumber.stdout.trim()}`} | head -n 20`

console.log(cut.stdout)
