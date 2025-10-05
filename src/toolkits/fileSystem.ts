// src/toolkits/file_system.ts
import * as fs from 'fs/promises'; // We use the modern, promise-based version of 'fs'
import logger from '../services/logger';

export async function createDirectory(directoryPath: string): Promise<string> {
  logger.info(`--- TOOL: Creating directory: '${directoryPath}' ---`);
  try {
    await fs.mkdir(directoryPath, { recursive: true });
    return `Successfully created directory at '${directoryPath}'.`;
  } catch (e: any) {
    return `Error creating directory: ${e.message}`;
  }
}

export async function writeToFile(filePath: string, content: string): Promise<string> {
  logger.info(`--- TOOL: Writing to file: '${filePath}' ---`);
  try {
    await fs.writeFile(filePath, content);
    return `Successfully wrote to '${filePath}'.`;
  } catch (e: any) {
    return `Error writing to file: ${e.message}`;
  }
}

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
