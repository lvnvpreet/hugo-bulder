import { promises as fs } from 'fs';
import * as path from 'path';

export class FileManager {
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`File written: ${filePath}`);
    } catch (error: any) {
      throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
  }

  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getStats(filePath: string): Promise<any> {
    try {
      return await fs.stat(filePath);
    } catch (error: any) {
      throw new Error(`Failed to get stats for ${filePath}: ${error.message}`);
    }
  }

  async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error: any) {
      throw new Error(`Failed to ensure directory ${dirPath}: ${error.message}`);
    }
  }

  async remove(filePath: string): Promise<void> {
    try {
      await fs.rm(filePath, { recursive: true, force: true });
    } catch (error: any) {
      throw new Error(`Failed to remove ${filePath}: ${error.message}`);
    }
  }

  async copyFile(src: string, dest: string): Promise<void> {
    try {
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(src, dest);
    } catch (error: any) {
      throw new Error(`Failed to copy file from ${src} to ${dest}: ${error.message}`);
    }
  }

  async writeBinaryFile(filePath: string, content: Buffer | Uint8Array): Promise<void> {
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content);
      console.log(`Binary file written: ${filePath}`);
    } catch (error: any) {
      throw new Error(`Failed to write binary file ${filePath}: ${error.message}`);
    }
  }

  async readDir(dirPath: string): Promise<string[]> {
    try {
      return await fs.readdir(dirPath);
    } catch (error: any) {
      throw new Error(`Failed to read directory ${dirPath}: ${error.message}`);
    }
  }
}
