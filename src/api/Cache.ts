import axios, { AxiosRequestConfig } from "axios"
import fs from "fs-extra"
import path from "path"
import crypto from "crypto"

export default class Cache {
    static async axiosGet(url: string, config?: AxiosRequestConfig) {
        const cacheDir = "/tmp/axiosCache"
        fs.ensureDirSync(cacheDir)

        const hash = crypto.createHash("md5").update(url).digest("hex")
        const cacheFile = path.join(cacheDir, `${hash}.json`)

        if (fs.existsSync(cacheFile)) {
            const data = await fs.readJson(cacheFile)
            return data
        }

        try {
            const response = await axios.get(url, config)
            const data = response.data

            await fs.writeJson(cacheFile, data)

            return data
        } catch (error) {
            //@ts-ignore
            throw new Error(`Failed to fetch data from ${url}: ${error?.message}`)
        }
    }
}
