export default class Terminal {
    constructor() {}

    static copy(text: string) {
        const base64Str = Buffer.from(text).toString("base64")
        const cmd = `\x1B]52;c;${base64Str}\x07`
        process.stdout.write(cmd)
    }

    static setTitle(title: string) {
        const cmd = `\u001B]2;${title}\u0007`
        process.stdout.write(cmd)
    }
}
