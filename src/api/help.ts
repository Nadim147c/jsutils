import size from "window-size"

type Argument = {
    argument: string
    description: string
}

type Option = {
    option: string
    description: string
}

export default class Help {
    private _options: Option[] = []

    /**@type {{argument:string, description: string}[]} */
    private _arguments: Argument[] = []

    _usages = "command [OPTIONS] [ARGUMENTS] "
    constructor(usages?: string) {
        if (usages) this._usages = usages
        this._options = []
        this._arguments = []
    }

    option(option: string, description: string) {
        this._options.push({ option, description })
        return this
    }

    argument(argument: string, description: string) {
        this._arguments.push({ argument, description })
        return this
    }

    private _warp(val: string, des: string, maxSize: number) {
        const tab = " ".repeat(4)
        const columnSize = size.get().width ?? process.stdout.columns
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
