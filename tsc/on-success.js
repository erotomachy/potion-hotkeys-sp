let fs = require('fs-extra');
let path = require('path');

function writeFileSyncRecursive(filename, content, charset) {
	filename.split(path.sep).slice(0,-1).reduce( (last, folder)=>{
		let folderPath = last ? (last + path.sep + folder) : folder
		if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath)
		return folderPath
	})
	
	fs.writeFileSync(filename, content, charset)
}

let defaultConfig = `
module.exports = {
	seRoot: ''
};
`;
if (!fs.existsSync('./tsc/config.js')) {
	fs.writeFileSync('./tsc/config.js', defaultConfig);
}
let { installedModRoot } = require('./config.js');
let outFile = require('../tsconfig.json').compilerOptions.outFile;
let pluginName = outFile ? outFile.replace(/^.*[\\\/]/, '') : undefined

let outDir = '';

if (!pluginName) {
	outDir = require('../tsconfig.json').compilerOptions.outDir;
	pluginName = outDir.replace(/^.*[\\\/]/, '');
}

console.log(`Installing ${pluginName}`);
if (!outDir) {
    writeFileSyncRecursive(path.join(installedModRoot, 'Platform\\PluginsDev', pluginName), fs.readFileSync(outFile));
    writeFileSyncRecursive(path.join(installedModRoot, 'Platform\\PluginsDev', `potion-hotkeys-sp-settings.txt`), fs.readFileSync(`./src/potion-hotkeys-sp-settings.json`));
} else {
    fs.copySync(`./dist/${pluginName}`, path.join(installedModRoot, 'Platform\\PluginsDev', pluginName));
    fs.copySync(`./src/action-speed-sp-settings.json`, path.join(installedModRoot, 'Platform\\PluginsDev', `potion-hotkeys-sp-settings.txt`));
}
