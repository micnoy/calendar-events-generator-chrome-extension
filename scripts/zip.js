#!/usr/bin/env node
// Builds dist/<name>-<version>.zip containing only files the extension needs at runtime.
// Uses the system `zip` binary (macOS + Ubuntu CI runners both have it preinstalled).

const { execFileSync } = require('node:child_process');
const { mkdirSync, existsSync, rmSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const name = require(join(root, 'package.json')).name;
const version = manifest.version;

const distDir = join(root, 'dist');
const outFile = join(distDir, `${name}-${version}.zip`);

if (!existsSync(distDir)) mkdirSync(distDir);
if (existsSync(outFile)) rmSync(outFile);

// Whitelist what ships in the extension — anything not here stays out of the zip.
const include = [
  'manifest.json',
  'popup.html',
  'popup.js',
  'popup.css',
  'settings.html',
  'settings.js',
  'settings.css',
  'crypto.js',
  'icons',
];

execFileSync('zip', ['-r', outFile, ...include], { cwd: root, stdio: 'inherit' });

console.log(`\nBuilt: ${outFile}`);
