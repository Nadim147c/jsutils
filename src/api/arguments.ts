import { z, ZodError, ZodRawShape } from "zod"
import { minimist } from "zx"
import Help from "./help.js"

type SchemaType<T extends ZodRawShape> = z.ZodObject<
    T,
    "strict",
    z.ZodTypeAny,
    {
        [k in keyof z.objectUtil.addQuestionMarks<z.baseObjectOutputType<T>, any>]: z.objectUtil.addQuestionMarks<
            z.baseObjectOutputType<T>,
            any
        >[k]
    },
    {
        [k in keyof z.baseObjectInputType<T>]: z.baseObjectInputType<T>[k]
    }
>

export default class Arguments<T extends ZodRawShape> {
    _schema: SchemaType<T>
    private _minimistArgs?: minimist.ParsedArgs
    private _tab = " ".repeat(4)

    constructor(schema: T) {
        this._schema = z.object(schema).strict()
    }

    private _getMinimistArgValue(key: string) {
        const minimistValue = this._minimistArgs?.[key]
        return typeof minimistValue !== "boolean" ? minimistValue : ""
    }

    private _parseZodErrors(error: ZodError) {
        const args = process.argv.slice(3)
        const errorLines: string[] = []

        for (const err of error.errors) {
            if (err.code === "unrecognized_keys") {
                let unknownOptions = `${this._tab}${chalk.yellow("unknown options:")}\n`
                for (const key of err.keys) {
                    let option = args.find((arg) => {
                        const param = arg.split("=").at(0)
                        return param?.endsWith("-" + key) ? param : null
                    })

                    if (!option?.startsWith("--")) option = `-${key}`
                    const value = this._getMinimistArgValue(key)
                    unknownOptions += `${this._tab.repeat(2)}${chalk.green(option)} ${chalk.red(value)}\n`
                }
                errorLines.push(unknownOptions)
                return errorLines
            }

            const path = err.path.join("-")
            if (path === "_" || path === "__") {
                errorLines.push(`${this._tab}${err.message}`)
                continue
            }
            const value = this._getMinimistArgValue(path)
            errorLines.push(`${this._tab}${chalk.green("--" + path)} ${chalk.red(value)}: ${err.message}`)
        }

        return errorLines
    }

    parse(helper: Help, opts: minimist.Opts) {
        const args = process.argv.slice(3)
        this._minimistArgs = minimist(args, opts)

        if (this._minimistArgs.help) {
            helper.print()
            process.exit(0)
        }

        if (opts.alias) for (const key of Object.keys(opts.alias)) delete this._minimistArgs[key]

        const schemaParsed = this._schema.safeParse(this._minimistArgs)
        if (!schemaParsed.success) {
            const errorLines = this._parseZodErrors(schemaParsed.error).join("\n")
            console.log(`${chalk.red("Error:")}\n${errorLines}`)
            process.exit(1)
        }

        return schemaParsed.data
    }
}
