#!/usr/bin/env node
/**
 * Generates a visual SVG gallery inside README.md for the svg-illustrations repo.
 *
 * Unlike an icon library, this repo has no fixed naming convention
 * (no _box24/-color/-thin suffixes), so this version auto-discovers
 * every top-level folder that contains .svg files and lists every
 * file found, using the filename (minus extension) as the caption.
 *
 * Usage:
 *   node generate-readme-gallery-illustrations.js
 *
 * Run this from the repository root (where README.md lives).
 * Re-run it any time you add/remove illustrations; it only replaces
 * the content between the GALLERY markers below.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const README_PATH = path.join(ROOT, 'README.md');
const MARKER_START = '<!-- GALLERY:START -->';
const MARKER_END = '<!-- GALLERY:END -->';
const COLUMNS = 4; // fewer columns than an icon set: these are bigger illustrations
const THUMB_WIDTH = 160; // displayed px width

// Folders to always skip when auto-discovering
const IGNORE_DIRS = new Set(['.git', 'node_modules', '.github']);

// Filenames matching this get excluded from the gallery (working/source
// files, not final visuals). Adjust to taste, or set to null to disable.
const EXCLUDE_PATTERN = /__layers/i;

function titleCase(dirName) {
  return dirName
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function findSvgFolders() {
  return fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !IGNORE_DIRS.has(entry.name))
    .map((entry) => entry.name)
    .filter((dirName) => {
      const files = fs.readdirSync(path.join(ROOT, dirName));
      return files.some((f) => f.toLowerCase().endsWith('.svg'));
    })
    .sort((a, b) => a.localeCompare(b));
}

function buildFolderGallery(dirName) {
  const folderPath = path.join(ROOT, dirName);
  let svgFiles = fs
    .readdirSync(folderPath)
    .filter((f) => f.toLowerCase().endsWith('.svg'))
    .sort((a, b) => a.localeCompare(b));

  if (EXCLUDE_PATTERN) {
    svgFiles = svgFiles.filter((f) => !EXCLUDE_PATTERN.test(f));
  }

  if (svgFiles.length === 0) return '';

  const cells = svgFiles.map((file) => {
    const name = file.replace(/\.svg$/i, '');
    const relPath = `${dirName}/${file}`;
    return (
      `<td align="center">` +
      `<img src="${relPath}" width="${THUMB_WIDTH}" alt="${name}" title="${name}" /><br/>` +
      `<sub>${name}</sub>` +
      `</td>`
    );
  });

  const rows = [];
  for (let i = 0; i < cells.length; i += COLUMNS) {
    rows.push(`  <tr>${cells.slice(i, i + COLUMNS).join('')}</tr>`);
  }

  return (
    `<details open>\n` +
    `<summary><strong>${titleCase(dirName)}</strong> (${svgFiles.length})</summary>\n\n` +
    `<table>\n${rows.join('\n')}\n</table>\n\n` +
    `</details>\n`
  );
}

function main() {
  const folders = findSvgFolders();
  if (folders.length === 0) {
    console.warn('No folders with .svg files found next to this script.');
    return;
  }

  const galleryBlocks = folders.map(buildFolderGallery).filter(Boolean).join('\n');
  const gallerySection = `${MARKER_START}\n\n${galleryBlocks}\n${MARKER_END}`;

  let readme = fs.existsSync(README_PATH) ? fs.readFileSync(README_PATH, 'utf8') : '';

  if (readme.includes(MARKER_START) && readme.includes(MARKER_END)) {
    const pattern = new RegExp(`${MARKER_START}[\\s\\S]*?${MARKER_END}`);
    readme = readme.replace(pattern, gallerySection);
  } else {
    readme = `${readme.trim()}\n\n## Gallery\n\n${gallerySection}\n`;
  }

  fs.writeFileSync(README_PATH, readme, 'utf8');
  console.log(`README.md updated with ${folders.length} gallery section(s): ${folders.join(', ')}`);
}

main();