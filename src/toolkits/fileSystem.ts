// src/toolkits/file_system.ts
import * as fs from 'fs/promises'; // We use the modern, promise-based version of 'fs'

export async function createDirectory(directoryPath: string): Promise<string> {
  console.log(`--- TOOL: Creating directory: '${directoryPath}' ---`);
  try {
    await fs.mkdir(directoryPath, { recursive: true });
    return `Successfully created directory at '${directoryPath}'.`;
  } catch (e: any) {
    return `Error creating directory: ${e.message}`;
  }
}

export async function writeToFile(
  filePath: string,
  content: string
): Promise<string> {
  console.log(`--- TOOL: Writing to file: '${filePath}' ---`);
  try {
    await fs.writeFile(filePath, content);
    return `Successfully wrote to '${filePath}'.`;
  } catch (e: any) {
    return `Error writing to file: ${e.message}`;
  }
}
