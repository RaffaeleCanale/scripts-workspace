'use strict'

const exec = require('child_process').exec;

function WindowModule() {}

WindowModule.prototype.init = function (callback) {
    let env = process.env.WINDOW_SCRIPTS

    if (!env) return callback('$WINDOW_SCRIPTS not found')

    this.modulesPath = env
    return callback()
}

WindowModule.prototype.execute = function (cmd, callback) {
    if (!this.modulesPath) return callback('Must init first')
    exec(this.modulesPath + cmd, (err, stdout, stderr) => {
        if (err) return callback(err)
        return callback(null, stdout)
    });
}


const instance = new WindowModule()

module.exports = instance
