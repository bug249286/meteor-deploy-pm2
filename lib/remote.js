const nodessh = require('node-ssh')
const path = require('path')

module.exports = {
  config: (deployJsonName = 'meteor-deploy.json') => {
    let cwd_process = process.cwd()
    return require(path.resolve(cwd_process, deployJsonName))
  },
  connect: async _config => {
    console.log('Start Connect to server')
    console.log('')
    let session_ssh = new nodessh()
    let config = {
      host: _config.server.host,
      username: _config.server.username
    }
    if (_config.server.password) {
      config.password = _config.server.password
    }
    if (_config.server.pem) {
      config.privateKey = _config.server.pem
    }
    try {
      await session_ssh.connect(config)
      return session_ssh
    } catch (err) {
      console.log('Connect to Server Error ', err)
    }
  },
  runCommand: async (cmd, ssh, method) => {
    try {
      let result = await ssh.execCommand(cmd, {})
      if (result.stderr) {
        if (/.*error.*/.test(result.stderr)) {
          console.log(`${method}\r\n`, result.stderr)
          return false
        }
      }
      return result.stdout
    } catch (error) {
      console.log(error)
      return false
    }
  },
  checkHost: async function (ssh) {
    let cmd = `(command -v node || echo 'missing node' 1>&2) && (command -v npm || echo 'missing npm' 1>&2) && (command -v pm2 || echo 'missing pm2' 1>&2)`
    console.log('Start check server')
    console.log('')
    let result = await this.runCommand(cmd, ssh, 'checkHost')
    if (/.*missing.*/.test(result)) {
      console.log('Error', result)
      return false
    } else {
      console.log('Success', result)
      return true
    }
  },
  initHost: async function (_config, ssh) {
    console.log('Start create folder application')
    console.log('')
    let cmd = `mkdir -p ${_config.server.deploymentDir}/${_config.appName}`
    return await this.runCommand(cmd, ssh, 'initHost')
  },
  upToServer: async function (_config, ssh) {
    console.log('Start upload bundle.tar.gz to server')
    console.log('')
    try {
      let cwd_process = process.cwd()
      await ssh.putFile(
        `${cwd_process}/deploy-app/bundle.tar.gz`,
        `${_config.server.deploymentDir}/${_config.appName}/bundle.tar.gz`
      )
      console.log('Upload App Success')
    } catch (err) {
      console.log('Upload App Fail')
      console.log(err)
      return false
    }
    console.log('Start upload pm2-deploy.json to server')
    try {
      let cwd_process = process.cwd()
      await ssh.putFile(
        `${cwd_process}/deploy-app/pm2-deploy.json`,
        `${_config.server.deploymentDir}/${_config.appName}/pm2-deploy.json`
      )
      console.log('Upload pm2-deploy.json Success')
    } catch (err) {
      console.log('Upload pm2-deploy.json Fail')
      console.log(err)
      return false
    }
    return true
  },
  upzip: async function (_config, ssh) {
    console.log('Start unzip')
    console.log('')
    let cmd = `cd ${_config.server.deploymentDir}/${_config.appName}  && rm -rf bundle && tar -xf bundle.tar.gz`
    return await this.runCommand(cmd, ssh, 'upzip')
  },
  install: async function (_config, ssh) {
    console.log('Start install')
    console.log('')
    let cmd = `cd ${_config.server.deploymentDir}/${_config.appName}/bundle/programs/server && node --version && npm install --production`
    return await this.runCommand(cmd, ssh, 'install')
  },
  start: async function (_config, ssh) {
    console.log('Start application!!')
    console.log('')
    let cmd = `cd ${_config.server.deploymentDir}/${_config.appName} && pm2 start pm2-deploy.json`
    return await this.runCommand(cmd, ssh, 'start')
  },
  isSuccess: async function (_config, ssh) {
    let cmd = `curl localhost:${_config.env.PORT}`
    let result = await this.runCommand(cmd, ssh, 'check')
    if (/.*__meteor_runtime_config__.*/.test(result)) {
      return true
    } else {
      return false
    }
  },
  save: async function (_config, ssh) {
    console.log('Save PM2 list!!')
    console.log('')
    let cmd = `cd ${_config.server.deploymentDir}/${_config.appName} && pm2 save`
    return await this.runCommand(cmd, ssh, 'save')
  },
  stop: async function (_config, ssh) {
    let cmd = `cd ${_config.server.deploymentDir}/${_config.appName} && pm2 stop pm2-deploy.json`
    return await this.runCommand(cmd, ssh, 'stop')
  },
  delete: async function (_config, ssh) {
    let cmd = `rm -rf ${_config.server.deploymentDir}/${_config.appName}`
    return await this.runCommand(cmd, ssh, 'delete')
  },
  scale: async function (_config, ssh, num) {
    let cmd = `pm2 scale ${_config.appName} ${num}`
    return await this.runCommand(cmd, ssh, 'start')
  },
  backup: async function (_config, ssh) {
    console.log('Start create backup folder application')
    console.log('')
    let cmd = `mkdir -p ${_config.server.deploymentDir}/${_config.appName}/backup`
    await this.runCommand(cmd, ssh, 'backup')
    cmd = `mv ${_config.server.deploymentDir}/${_config.appName}/bundle.tar.gz ${_config.server.deploymentDir}/${_config.appName}/backup/bundle.tar.gz`
    return await this.runCommand(cmd, ssh, 'backup')
  },
  rollback: async function (_config, ssh) {
    console.log('Start create backup folder application')
    console.log('')
    let cmd = `mkdir -p ${_config.server.deploymentDir}/${_config.appName}/backup`
    await this.runCommand(cmd, ssh, 'backup')
    cmd = `mv ${_config.server.deploymentDir}/${_config.appName}/backup/bundle.tar.gz ${_config.server.deploymentDir}/${_config.appName}/bundle.tar.gz`
    await this.runCommand(cmd, ssh, 'backup')

    console.log('Start unzip')
    console.log('')
    cmd = `cd ${_config.server.deploymentDir}/${_config.appName}  && rm -rf bundle && tar -xf bundle.tar.gz`
    await this.runCommand(cmd, ssh, 'upzip')

    console.log('Start install')
    console.log('')
    cmd = `cd ${_config.server.deploymentDir}/${_config.appName}/bundle/programs/server && node --version && npm install --production`
    await this.runCommand(cmd, ssh, 'install')

    console.log('Start application!!')
    console.log('')
    cmd = `cd ${_config.server.deploymentDir}/${_config.appName} && pm2 start pm2-deploy.json`
    return await this.runCommand(cmd, ssh, 'start')
  }
}
