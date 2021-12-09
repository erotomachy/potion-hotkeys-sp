let fs = require('fs');
let path = require('path');

let config = require('./config');
let package = JSON.parse(fs.readFileSync('./package.json'));

let tsconfig = JSON.parse(fs.readFileSync('./tsconfig-default.json'));
tsconfig.compilerOptions.baseUrl = path.join(config.skyrimPlatformRoot, 'Platform', 'Modules');
tsconfig.compilerOptions.outFile = path.join('.', 'dist', package.name + '.js');
fs.writeFileSync('./tsconfig.json', JSON.stringify(tsconfig, null, 2));
