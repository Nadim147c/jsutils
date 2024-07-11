#!/usr/bin/env zx

import inquirer from "inquirer"
import { z } from "zod"
import Arguments from "../api/arguments.js"
import Cache from "../api/Cache.js"
import Help from "../api/help.js"

const args = new Arguments({
    _: z.array(z.string()).nonempty(),
    __: z.array(z.string()).optional(),
    "episode-index": z.boolean().optional(),
    anime: z.string().optional(),
    help: z.boolean().optional(),
    debug: z.boolean().optional(),
})

const helper = new Help("Usage: ani-skip-embed -i vidoe_path -i another_path")
helper
    .option("-i, --episode-index", "Use file index as episode number")
    .option("--copy", "Copy file that doesn't have interval")

const argv = args.parse(helper, {
    alias: { h: "help", a: "anime", i: "episode-index" },
    boolean: ["help", "debug", "episode-index"],
})

if (argv.debug) console.log(argv)

let animeName = argv.anime

if (!animeName) {
    const animeNameQuestion = await inquirer.prompt([
        {
            type: "input",
            message: "What is the name of your anime? ",
            name: "animeName",
            default: argv._.at(0),
            prefix: "",
        },
    ])

    animeName = animeNameQuestion.animeName?.trim() as string
}

console.log(`Searching for anime: ${chalk.cyan(animeName)}`)

const agent = "Mozilla/5.0 (Windows NT 6.1; Win64; rv:109.0) Gecko/20100101 Firefox/109.0"
const malURI = new URL("https://myanimelist.net/search/prefix.json")
malURI.searchParams.set("type", "anime")
malURI.searchParams.set("keyword", animeName)

const malAnime = await spinner(() => Cache.axiosGet(`${malURI}`, { headers: { "User-Agent": agent } }))

if (argv.debug) console.log(malAnime)

//@ts-ignore
const animeNameList = malAnime?.categories?.[0]?.items?.map((item, i) => `${i + 1}. ${item.name}`) as string[]

if (!animeNameList?.length) {
    console.error("No anime found")
    process.exit(1)
}

const index = await $({ input: animeNameList.join("\n") })`fzf --prompt 'Anime Name: ' | cut -d'.' -f1`

const malId = malAnime.categories[0].items[parseInt(index.toString()) - 1].id
if (!malId) {
    console.error("Failed find myanimelist id.")
    process.exit(1)
}
if (argv.debug) console.log(`Mal ID: ${malId}`)

function createChapter(start: number, end: number, title: string) {
    if (argv.debug) console.log({ start, end, title })
    return `
[CHAPTER]
TIMEBASE=1/1
START=${start}
END=${end}
title=${title}
`
}

for (const video of argv._) {
    const episodeQuestion = [
        {
            name: "episode",
            type: "number",
            message: `What is episode number for ${video}`,
            prefix: "",
        },
    ]

    const episode = (await inquirer.prompt(episodeQuestion).then((ans) => ans.episode)) as number

    if (argv.debug) console.log(`episode number: ${episode}`)
    const aniSkipURI = `https://api.aniskip.com/v1/skip-times/${malId}/${episode}?types=op&types=ed`
    const aniSkip = await spinner(() => Cache.axiosGet(aniSkipURI))

    const aniSkipSchema = z.object({
        found: z.boolean(),
        results: z.array(
            z.object({
                interval: z.object({ start_time: z.number(), end_time: z.number() }),
                skip_type: z.union([z.literal("op"), z.literal("ed")]),
                skip_id: z.string().uuid(),
                episode_length: z.number(),
            })
        ),
    })

    const data = aniSkipSchema.parse(aniSkip)

    if (data.found && data.results.length) {
        let metadata = ""

        const results = data.results.sort((a, b) => a.interval.start_time - b.interval.start_time)

        if (results[0].interval.start_time > 0) metadata = createChapter(0, results[0].interval.start_time, "Preview")

        for (let i = 0; i < results.length; i++) {
            const chapter = results[i]

            const title = chapter?.skip_type === "op" ? "Opening" : "Ending"
            const { start_time, end_time } = chapter.interval

            metadata += createChapter(start_time, end_time, title)

            if (i < results.length - 1) {
                const nextChapter = results[i + 1]
                const { start_time, end_time } = nextChapter.interval
                metadata += createChapter(start_time, end_time, "Episode")
            } else {
                const episodeLength = chapter.episode_length
                const title = chapter.skip_type === "op" ? "Episode" : "Post Ending"
                metadata += createChapter(end_time, episodeLength, title)
            }
        }

        if (argv.debug) console.log(metadata)

        if (argv.debug) console.log(`Creating temp file:`)
        const chapterFile = await $`mktemp`.verbose(argv.debug)

        if (argv.debug) console.log(`Exporting existing metadata`)
        await $`ffmpeg -i ${video} -f ffmetadata -y ${chapterFile}`.quiet()
        if (argv.debug) echo(await $`cat ${chapterFile}`)

        await $`echo ${metadata} >> ${chapterFile}`

        const inputPathSplit = video.split(".")
        inputPathSplit.splice(inputPathSplit.length - 1, 0, `ani-skip`)
        const outputPath = inputPathSplit.join(".")

        console.log(`Creating ${outputPath}`)
        await spinner(() => $`ffmpeg -i ${video} -i ${chapterFile} -map_metadata 1 -c copy -y ${outputPath}`.quiet())
    } else {
        console.error("Ani-Skip entry doesn't exists for this episode.")

        const inputPathSplit = video.split(".")
        inputPathSplit.splice(inputPathSplit.length - 1, 0, `ani-skip`)
        const outputPath = inputPathSplit.join(".")
        await $`cp -f ${video} ${outputPath}`
    }
}
