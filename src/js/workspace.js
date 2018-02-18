'use strict'

const async = require('async')
const exec = require('child_process').exec;


const WindowModules = require('./window_modules')
const App = require('./app')

const configFile = process.argv[2]
const mode = process.argv[3]
const name = process.argv[4]

const GLOBAL = {
    currentDesktop: undefined,
    windowsIdentified: {},

    get desktop() {
        return GLOBAL.currentDesktop
    },

    retain: function (id) {
        GLOBAL.windowsIdentified[id] = true
    },

    hasAppWith: function (id) {
        return GLOBAL.windowsIdentified[id]
    }
}

function parseConfigFile() {
    const config = require(configFile)

    let i = 1
    for (let workspace in config) {
        if (config.hasOwnProperty(workspace)) {
            config[workspace].index = i
            i++
        }
    }
    return config
}

function printArray(array) {
    console.log(array.join('\n'));
}


function applyWorkspace(apps) {
    async.series([
        async.each.bind(null, apps, (app, cb) => app.validate(cb)),
        WindowModules.init.bind(WindowModules),
        getCurrentDesktop,
        async.each.bind(null, apps, (app, cb) => app.tryIdentify(GLOBAL, cb)),
        async.each.bind(null, apps, (app, cb) => app.tryOpen(cb)),
        async.each.bind(null, apps, (app, cb) => app.identify(GLOBAL, cb)),
        async.each.bind(null, apps, (app, cb) => app.move(cb))
    ], (err, res) => {
        if (err) console.error(err)
    })
}

function getCurrentDesktop(callback) {
    return WindowModules.execute('currentDesktop', (err, res) => {
        if (err) return callback(err)

        GLOBAL.currentDesktop = res
        return callback()
    })
}


function findWorkspace(name) {
    const config = parseConfigFile()

    let index = Number(name)
    if (index) {
        for (let workspace in config) {
            if (config.hasOwnProperty(workspace)) {
                if (typeof config[workspace].index === 'number' && config[workspace].index === index)
                    return config[workspace]
            }
        }

        return null
    } else {
        return config[name]
    }
}

function workspaceToString(name, w) {
    let prefix = w.index

    return prefix + ' ' + name
}

switch (mode) {
    case 'list':
        const config = parseConfigFile()
        return printArray(Object.keys(config)
                .map(w => workspaceToString(w, config[w])))
    case 'apply':
        const workspace = findWorkspace(name)
        if (!workspace) return console.error('Workspace not found')
        if (!workspace.apps) return console.error('Apps not found in workspace')

        return applyWorkspace(
            workspace.apps.map((config) => new App(config, workspace.globals))
        )
    default:
        return console.error('Unkown mode: ' + mode)
}
