'use strict'

const spawn = require('child_process').spawn

const async = require('async')
const WindowModules = require('./window_modules')

function executeSpawn(cmd) {
    spawn('bash', ['-c', cmd], {
        detached: true,
        stdio: [ 'ignore', 'ignore', 'ignore' ]
    }).unref()
}


function App(config, globals) {
    this.config = config

    for (let property in globals) {
        if (globals.hasOwnProperty(property)) {
            if (this.config[property] === undefined) {
                this.config[property] = globals[property]
            }
        }
    }
}

App.prototype.validate = function (callback) {
    const required = ['cmd', 'windowClass', 'pos', 'screen']

    required.forEach((field) => {
        if (this.config[field] === undefined) return callback(`App is missing '${field}: ${JSON.stringify(app)}'`)
    })

    return callback()
}

App.prototype.identify = function(globals, callback) {
    return async.retry({
            times: this.config.identifyRetry || 5,
            interval: this.config.identifyInterval || 1000
        },
        (cb) => this.tryIdentify(globals, (err, res) => {
            // console.log(app.windowClass, err, res);
            if (err || !res) return cb('Cannot find ' + this.toString())
            return cb()
        }),
        callback)
}

App.prototype.tryIdentify = function (globals, callback) {
    if (this.id) return callback(null, true)

    const title = this.config.windowName ? `"${this.config.windowName}"` : ''
    WindowModules.execute(`findWindow "${this.config.windowClass}" ${globals.desktop} ${title}`,
        (err, res) => {
            if (err) return callback(err)

            let ids = res.split('\n').filter(line => line !== '')

            for (let id of ids) {
                if (!globals.hasAppWith(id)) {
                    this.id = id

                    globals.retain(id)

                    return callback(null, true)
                }
            }

            return callback(null, false)
        }
    )
}

App.prototype.move = function (callback) {
    if (!this.id) return callback()

    let desktop
    if (this.config.windowDesktop === undefined || this.config.desktop === 'any') {
        desktop = ''
    } else if (this.config.windowDesktop === 'current') {
        desktop = currentDesktop
    } else {
        desktop = this.config.windowDesktop
    }

    return WindowModules.execute(
        `moveWindow ${this.id} ${this.config.pos} ${this.config.screen} ${desktop}`,
        callback
    )

}

App.prototype.tryOpen = function (callback) {
    if (this.id) return callback()

    executeSpawn(this.config.cmd)
    callback()
}

App.prototype.toString = function () {
    return this.config.windowClass + '/' + (this.config.windowName ? this.config.windowName : '-')
}

module.exports = App;
