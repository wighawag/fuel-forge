#!/usr/bin/env node

import fs from "fs";

// Script to delete the address line after [proxy] section in Forc.toml

const filePath = "contract/Forc.toml";

function deleteProxyAddress() {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File ${filePath} not found!`);
    process.exit(1);
  }

  console.log(`Removing address line from ${filePath}...`);

  // Create a backup
  const backupPath = `${filePath}.backup`;
  fs.copyFileSync(filePath, backupPath);
  console.log(`Backup created: ${backupPath}`);

  // Read the file content
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  // Process the lines
  const processedLines = [];
  let inProxySection = false;
  let foundEnabledTrue = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if we're entering the [proxy] section
    if (line === "[proxy]") {
      inProxySection = true;
      foundEnabledTrue = false;
      processedLines.push(lines[i]);
      continue;
    }

    // Check if we're leaving the [proxy] section (entering another section)
    if (line.startsWith("[") && line !== "[proxy]" && inProxySection) {
      inProxySection = false;
      foundEnabledTrue = false;
    }

    // If we're in the proxy section
    if (inProxySection) {
      // Check for enabled = true
      if (line === "enabled = true") {
        foundEnabledTrue = true;
        processedLines.push(lines[i]);
        continue;
      }

      // Skip the address line if we found enabled = true
      if (foundEnabledTrue && line.startsWith("address")) {
        console.log(`Removing line: ${line}`);
        continue; // Skip this line
      }
    }

    // Add all other lines
    processedLines.push(lines[i]);
  }

  // Write the modified content back to the file
  const modifiedContent = processedLines.join("\n");
  fs.writeFileSync(filePath, modifiedContent);

  console.log("Address line removed successfully!");

  // Show the modified [proxy] section
  console.log("Modified [proxy] section:");
  const finalContent = fs.readFileSync(filePath, "utf8");
  const finalLines = finalContent.split("\n");
  let showingProxy = false;

  for (const line of finalLines) {
    const trimmed = line.trim();
    if (trimmed === "[proxy]") {
      showingProxy = true;
      console.log(line);
    } else if (trimmed.startsWith("[") && trimmed !== "[proxy]") {
      if (showingProxy) break;
    } else if (showingProxy && trimmed) {
      console.log(line);
    }
  }
}

// Run the function
deleteProxyAddress();
