// src/toolkits/file_system.ts
import * as fs from 'fs/promises'; // We use the modern, promise-based version of 'fs'
import logger from '../services/logger';
import path from 'path';

// --- File System Tools ---

// Creates a directory at the specified path.
// If the directory already exists, it does nothing.

export async function createDirectory(directoryPath: string): Promise<string> {
  logger.info(`--- TOOL: Creating directory: '${directoryPath}' ---`);
  try {
    await fs.mkdir(directoryPath, { recursive: true });
    return `Successfully created directory at '${directoryPath}'.`;
  } catch (e: any) {
    return `Error creating directory: ${e.message}`;
  }
}

export async function writeToFile(args: { filePath?: string; topic?: string; content: string; client: string }): Promise<string> {
  const { filePath: providedPath, topic, content, client } = args;
  let finalPath: string;

  if (providedPath) {
    finalPath = providedPath;
  } else if (topic && client && content) {
    const fileName = `${topic.replace(/[^\w\s]/gi, '').replace(/ /g, '_')}.md`;
    finalPath = path.join('data', client, 'outputs', fileName);
  } else {
    return "Error: writeToFile requires 'content' and either a 'filePath' or both 'topic' and 'client'.";
  }

  logger.info({ path: finalPath }, `--- TOOL: Writing to file ---`);
  try {
    const dir = path.dirname(finalPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(finalPath, content);
    return `Successfully wrote to '${finalPath}'.`;
  } catch (e: any) {
    return `Error writing to file: ${e.message}`;
  }
}

// export async function writeToFile(filePath: string, content: string): Promise<string> {
//   logger.info(`--- TOOL: Writing to file: '${filePath}' ---`);
//   try {
//     // NEW: Ensure the directory exists before writing
//     const dir = path.dirname(filePath);
//     await fs.mkdir(dir, { recursive: true });

//     await fs.writeFile(filePath, content);
//     return `Successfully wrote to '${filePath}'.`;
//   } catch (e: any) {
//     return `Error writing to file: ${e.message}`;
//   }
// }

export async function readFile(filePath: string): Promise<string> {
  logger.info(`--- TOOL: Reading file: '${filePath}' ---`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return `Content of ${filePath}:\n\n${content}`;
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      return `Error: The file '${filePath}' was not found.`;
    }
    return `Error reading file: ${e.message}`;
  }
}

// ⚠️ WARNING: This is a destructive tool.
// A bug or a misunderstanding by the agent could lead to permanent data loss.
// Use with extreme caution.
export async function deleteFile(filePath: string): Promise<string> {
  logger.info(`--- TOOL: Deleting file: '${filePath}' ---`);
  try {
    await fs.unlink(filePath);
    return `Successfully deleted file at '${filePath}'.`;
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      return `Error: The file '${filePath}' was not found.`;
    }
    return `Error deleting file: ${e.message}`;
  }
}
