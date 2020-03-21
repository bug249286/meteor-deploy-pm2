const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const abs = require('abs')
const rimraf = require('rimraf')
module.exports = {
  removeFolder: f =>
    new Promise((resolve, reject) => {
      rimraf(f, function () {
        resolve(true)
      })
    }),
  waiting: time =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(true)
      }, time)
    }),
  init: async function () {
    let default_json = require('./meteor-deploy.json')
    try {
      let prettyJson = JSON.stringify(default_json, null, 2)
      fs.writeFileSync('meteor-deploy.json', prettyJson)
      fs.writeFileSync('settings.json', '{}')
      return true
    } catch (err) {
      console.log(err)
      return false
    }
  },
  createDeployApp: async function () {
    console.log('Create deploy app folder')
    let cwd_process = process.cwd()
    if (fs.existsSync(`${cwd_process}/deploy-app`)) {
      await this.removeFolder(`${cwd_process}/deploy-app`)
    }
    fs.mkdirSync(`${cwd_process}/deploy-app`)
  },
  runCommand: cmd =>
    new Promise((resolve, reject) => {
      exec(
        cmd,
        {
          maxBuffer: 1024 * 200000
        },
        (error, stdout, stderr) => {
          if (error) {
            reject(error)
          }
          resolve(stdout ? stdout : stderr)
        }
      )
    }),
  build: async function (deployJsonName = 'meteor-deploy.json') {
    console.log('start building...')
    let cwd_process = process.cwd()
    let config = require(path.resolve(cwd_process, deployJsonName))
    let command = `cd ${abs(
      config.sourceLocation
    )} && meteor build --architecture os.linux.x86_64 --directory ${cwd_process}/deploy-app`
    try {
      await this.runCommand(command)
      console.log('building SUCCESS')
      return true
    } catch (err) {
      console.log(err)
      return false
    }
  },

  zip: async function () {
    console.log('start zip...')
    let cwd_process = process.cwd()
    let command = `cd ${cwd_process}/deploy-app && tar -zcvf bundle.tar.gz bundle`
    try {
      await this.runCommand(command)
      await this.removeFolder(`${cwd_process}/deploy-app/bundle`)
      console.log('zip SUCCESS')
      return true
    } catch (err) {
      console.log(err)
      return false
    }
  },

  generate_pm2_config: (deployJsonName = 'meteor-deploy.json') => {
    let template_app_pm2 = {}
    let cwd_process = process.cwd()
    let settings = {}
    let config = require(path.resolve(cwd_process, deployJsonName))
    if (fs.existsSync(path.resolve(cwd_process, config.settingFileName))) {
      settings = require(path.resolve(cwd_process, config.settingFileName))
      if (settings) {
        config.env.METEOR_SETTINGS = settings
      }
    }
    template_app_pm2 = config.pm2
    template_app_pm2.name = config.appName
    template_app_pm2.env = config.env
    template_app_pm2.script = `${config.server.deploymentDir}/${config.appName}/bundle/main.js`
    let prettyJson = JSON.stringify(template_app_pm2, null, 2)
    try {
      fs.writeFileSync('deploy-app/pm2-deploy.json', prettyJson)
      return true
    } catch (err) {
      console.log(err)
      return false
    }
  },

  remove: async function () {
    let cwd_process = process.cwd()
    if (fs.existsSync(`${cwd_process}/deploy-app`)) {
      await this.removeFolder(`${cwd_process}/deploy-app`)
    }
  }
}
