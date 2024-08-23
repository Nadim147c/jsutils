#!/usr/bin/env node

import { Command } from "@commander-js/extra-typings"
import { homedir } from "os"
import windowSize from "window-size"
import "zx/globals"

const program = new Command("weather")
    .option("--city <city>", "City to fetch weather info.")
    .option("--new-city <city>", "Set a new default city for weather")
    .configureHelp({ helpWidth: windowSize?.get()?.width })
    .action(async (option) => {
        const locationFile = homedir() + "/.city"

        let location = await fs.readFile(locationFile, "utf-8").catch(console.error)

        if (!location || option.newCity) {
            location = option.newCity ? option.newCity : await question("What is your location? ")
            await fs.writeFile(locationFile, location, "utf-8")
        }

        const url = new URL("https://www.wttr.in")
        url.pathname = `/${argv.city ? argv.city : location.trim()}`
        url.search = "?1Fq"

        const weatherData = await spinner("Getting weather information", async () => $`curl -s ${url}`.nothrow())

        echo(weatherData)
    })

program.parse()
