const { execSync } = require('child_process')
const path = require('path')

module.exports = async (context) => {
  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productName}.app`
  )
  console.log(`  • ad-hoc signing: ${appPath}`)
  execSync(`codesign --deep --force --sign - "${appPath}"`)
  console.log(`  • signed OK`)
}
