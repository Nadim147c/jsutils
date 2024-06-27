#!/usr/bin/env zx

import "zx/globals"
import Help from "../api/help.js"
import inquirer from "inquirer"

const argv = minimist(process.argv.slice(3), {
    alias: { help: ["h"] },
    boolean: ["help", "user", "system"],
})

if (argv.help) {
    const helper = new Help("Usage: systemctl-add [OPTIONS] NAME")
    helper
        .option("-h, --help", "Prints the help menu")
        .argument("NAME", "The name of the unit")
        .option("--user", "Create a user unit (Default on)")
        .option("--system", "Create a user unit")
    helper.print()
    process.exit()
}

const name = argv._.at(0)
if (!name) {
    console.log("Please specify a name of for the service")
    process.exit()
}
const serviceName = name?.endsWith(".service") ? name : `${name}.service`

const answers = await inquirer.prompt([
    {
        type: "input",
        name: "description",
        message: "Please provide a description for this service:",
    },
    {
        type: "input",
        name: "startCommand",
        message: "What command should be executed to start this service?",
    },
    {
        type: "input",
        name: "stopCommand",
        message: "What command should be executed to stop this service gracefully?",
    },
    {
        type: "input",
        name: "timeoutStopSec",
        message: "How many seconds should systemd wait for the service to stop?",
        default: "5",
    },
    {
        type: "input",
        name: "username",
        message: "Under which user account should this service run?",
    },
    {
        type: "confirm",
        name: "enable",
        message: "Should this service be enabled to start automatically on system boot?",
        default: true,
    },
])

const unitFileContent = `\
[Unit]
Description=${answers.description}
After=network.target

[Service]
Type=simple
${answers.username ? `User=${answers.username}` : ""}
ExecStart=${answers.startCommand}
ExecStop=${answers.stopCommand}
TimeoutStopSec=${answers.timeoutStopSec}

[Install]
WantedBy=${answers.enable ? "default.target" : ""}
`

const userServiceDir = `${os.homedir()}/.config/systemd/user`
const systemServiceDir = `/etc/systemd/system`

const $$ = $({ input: unitFileContent })

if (argv.system) {
    if ((await $`[[ id -u != 0 ]]`.exitCode) !== 0) {
        console.log("Please run this script with root previlagee")
        process.exit(1)
    }
    console.log(`Making sure the ${systemServiceDir} exits.`)
    await $`mkdir -p ${systemServiceDir}`.nothrow()

    const servicePath = `${systemServiceDir}/${serviceName}`
    await $$`cat > ${servicePath}`
    await $`systemctl daemon-reload`

    console.log(`You can edit the newly created service unit from '${servicePath}'`)
    console.log(`You might need to run: 'systemctl daemon-reload' after editing`)
} else {
    console.log(`Making sure the ${userServiceDir} exits.`)
    await $`mkdir -p ${userServiceDir}`.nothrow()

    const servicePath = `${userServiceDir}/${serviceName}`
    await $$`cat > ${servicePath}`
    await $`systemctl --user daemon-reload`

    console.log(`You can edit the newly created service unit from '${servicePath}'`)
    console.log(`You might need to run: 'systemctl --user daemon-reload' after editing`)
}
