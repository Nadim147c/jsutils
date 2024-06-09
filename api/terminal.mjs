export default class Terminal {
    constructor() {}

    /**
     * @param {string} text String to copy
     */
    static copy(text) {
        const base64Str = Buffer.from(text).toString("base64")
        const cmd = `\x1B]52;c;${base64Str}\x07`
        process.stdout.write(cmd)
    }

    /**
     * @param {string} title String to set as terminal title
     */
    static setTitle(title) {
        const cmd = `\u001B]2;${title}\u0007`
        process.stdout.write(cmd)
    }
}
