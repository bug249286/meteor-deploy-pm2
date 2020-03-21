#! /usr/bin/env node
const { program } = require('commander')
const Local = require('./local')
const Remote = require('./remote')
program.version('1.0.0')
program
  .command('init')
  .description('init application config')
  .action(async function () {
    await Local.init()
  })
program
  .command('deploy')
  .description('deploy your App to the server(s)')
  .option('-c, --config [type]', 'Config File')
  .action(async function () {
    const config =
      this.config !== undefined && this.config !== true
        ? this.config
        : 'meteor-deploy.json'
    await Local.createDeployApp()
    await Local.generate_pm2_config(config)
    await Local.build(config)
    await Local.zip()

    const config_json = Remote.config(config)
    const ssh = await Remote.connect(config_json)
    const result_check = await Remote.checkHost(ssh)
    if (!result_check) {
      ssh.dispose()
      return false
    }
    const result_init = await Remote.initHost(config_json, ssh)
    if (result_init === false) {
      ssh.dispose()
      return false
    }

    const result_uptoserver = await Remote.upToServer(config_json, ssh)
    if (result_uptoserver === false) {
      ssh.dispose()
      return false
    }

    const result_unzip = await Remote.upzip(config_json, ssh)
    if (result_unzip === false) {
      ssh.dispose()
      return false
    }

    const result_install = await Remote.install(config_json, ssh)
    if (result_install === false) {
      ssh.dispose()
      return false
    }

    const result_start = await Remote.start(config_json, ssh)
    if (result_start === false) {
      ssh.dispose()
      return false
    }
    console.log('------- ... LOADING ... -------')
    await Local.waiting(10000)
    const result = await Remote.isSuccess(config_json, ssh)
    if (result === true) {
      console.log('------- DEPLOY STATUS SUCCESS -------')
    } else {
      console.log('------- DEPLOY STATUS FAIL -------')
    }
    ssh.dispose()
    await Local.remove()
  })
program
  .command('backup')
  .option('-c, --config [type]', 'Config File')
  .description('init application config')
  .action(async function () {
    const config =
      this.config !== undefined && this.config !== true
        ? this.config
        : 'meteor-deploy.json'
    const config_json = Remote.config(config)
    const ssh = await Remote.connect(config_json)
    await Remote.backup(config_json, ssh)
    ssh.dispose()
  })
program
  .command('rollback')
  .option('-c, --config [type]', 'Config File')
  .description('init application config')
  .action(async function () {
    const config =
      this.config !== undefined && this.config !== true
        ? this.config
        : 'meteor-deploy.json'
    const config_json = Remote.config(config)
    const ssh = await Remote.connect(config_json)

    await Remote.rollback(config_json, ssh)

    console.log('------- ... LOADING ... -------')
    await Local.waiting(10000)
    const result = await Remote.isSuccess(config_json, ssh)
    if (result === true) {
      console.log('------- DEPLOY STATUS SUCCESS -------')
    } else {
      console.log('------- DEPLOY STATUS FAIL -------')
    }
    ssh.dispose()
  })
program.parse(process.argv)
