#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Recursively find all TypeScript files in a directory
 */
function findTsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findTsFiles(fullPath));
    } else if (item.endsWith(".ts") && !item.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Fix imports in a TypeScript file by adding .js extensions to relative imports
 */
function fixImportsInFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  // Get the directory of the current file to resolve relative paths
  const currentDir = path.dirname(filePath);

  // Regex patterns to match different import/export statements with relative paths
  const patterns = [
    // import { ... } from './path'
    // import * from './path'
    // import './path'
    /(\bimport\s+(?:[^'"]*\s+from\s+)?['"])(\.[^'"]*?)(['"])/g,

    // export { ... } from './path'
    // export * from './path'
    /(\bexport\s+(?:[^'"]*\s+from\s+)?['"])(\.[^'"]*?)(['"])/g,
  ];

  let newContent = content;

  for (const pattern of patterns) {
    newContent = newContent.replace(
      pattern,
      (match, prefix, importPath, suffix) => {
        // Skip if already has .js extension or /index.js
        if (importPath.endsWith(".js") || importPath.endsWith("/index.js")) {
          return match;
        }

        // Skip if it's not a relative import (doesn't start with . or ..)
        if (!importPath.startsWith("./") && !importPath.startsWith("../")) {
          return match;
        }

        // Resolve the absolute path to check if it's a directory or file
        const resolvedPath = path.resolve(currentDir, importPath);

        // Check if it's a directory (should get /index.js)
        if (
          fs.existsSync(resolvedPath) &&
          fs.statSync(resolvedPath).isDirectory()
        ) {
          modified = true;
          return prefix + importPath + "/index.js" + suffix;
        }

        // Check if it's a TypeScript file (should get .js)
        const tsFilePath = resolvedPath + ".ts";
        if (fs.existsSync(tsFilePath)) {
          modified = true;
          return prefix + importPath + ".js" + suffix;
        }

        // If we can't determine the type, assume it's a file and add .js
        modified = true;
        return prefix + importPath + ".js" + suffix;
      }
    );
  }

  if (modified) {
    fs.writeFileSync(filePath, newContent, "utf8");
    console.log(`Fixed imports in: ${filePath}`);
    return true;
  }

  return false;
}

/**
 * Main function
 */
function main() {
  const typescriptDir = path.join(__dirname, "typescript", "src");

  if (!fs.existsSync(typescriptDir)) {
    console.error(`TypeScript source directory not found: ${typescriptDir}`);
    process.exit(1);
  }

  console.log(`Scanning for TypeScript files in: ${typescriptDir}`);

  const tsFiles = findTsFiles(typescriptDir);
  console.log(`Found ${tsFiles.length} TypeScript files`);

  let fixedCount = 0;

  for (const file of tsFiles) {
    if (fixImportsInFile(file)) {
      fixedCount++;
    }
  }

  console.log(`\nCompleted! Fixed imports in ${fixedCount} files.`);
}

// Run the script
console.log("Starting import fix...");
main();
console.log(`------------------------------`);
