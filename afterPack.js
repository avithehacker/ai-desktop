const { execSync } = require('child_process')

module.exports = async (context) => {
  if (process.platform === 'darwin') {
    execSync(`xattr -cr "${context.appOutDir}"`)
  }
}
