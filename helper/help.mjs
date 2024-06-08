"use strict"

export default class Help {
    /**@type {{option:string, description: string}[]} */
    _options = []

    /**@type {{argument:string, description: string}[]} */
    _arguments = []

    _usages = "command [OPTIONS] [ARGUMENTS] "
    /**@param {string} usages */
    constructor(usages) {
        this._usages = usages
        this._options = []
        this._arguments = []
    }

    /**
     * Add option to help object.
     * @param {string} option
     * @param {string} description
     * @returns {this}
     */
    option(option, description) {
        this._options.push({ option, description })
        return this
    }

    /**
     * Add argument to help object.
     * @param {string} argument
     * @param {string} description
     * @returns {this}
     */
    argument(argument, description) {
        this._arguments.push({ argument, description })
        return this
    }

    /**
     * @param {string} val
     * @param {string} des
     * @param {number} maxSize
     * @returns {string}
     */
    _warp(val, des, maxSize) {
        const tab = " ".repeat(4)
        const columnSize = process.stdout.columns
        const indentSize = maxSize + 8
        const indent = " ".repeat(indentSize)

        let content = `${tab}${val}${tab}`

        if (columnSize - indentSize < 50) return content

        content += content.length <= indentSize ? " ".repeat(indentSize - content.length) : `\n${indent}`

        for (const word of des.trim().split(" ")) {
            if (word.length > 50) return

            const currentDescriptionLine = content.split("\n").at(-1)

            if ((currentDescriptionLine + word).length < columnSize) {
                content += ` ${word}`
            } else {
                content += `\n${indent} ${word}`
            }
        }

        return content
    }

    toString() {
        let content = `${this._usages}\n`

        const maxSize = Math.max(
            ...this._arguments.map((x) => x.argument.length),
            ...this._options.map((x) => x.option.length)
        )

        if (this._arguments.length) content += "\nArguments:\n"
        this._arguments.forEach((arg) => {
            const optionText = this._warp(arg.argument, arg.description, maxSize)
            content += `${optionText}\n`
        })

        if (this._options.length) content += "\nOptions:\n"
        this._options.forEach((arg) => {
            const optionText = this._warp(arg.option, arg.description, maxSize)
            content += `${optionText}\n`
        })
        return content
    }

    print() {
        console.log(this.toString())
    }
}
