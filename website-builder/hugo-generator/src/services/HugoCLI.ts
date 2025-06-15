import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { FileManager } from '../utils/FileManager';
import * as yaml from 'js-yaml';

export class HugoCLI {
  private execAsync = promisify(exec);
  private hugoVersion: string | null = null;
  private fileManager: FileManager;
  
  constructor() {
    this.fileManager = new FileManager();
    this.validateHugoInstallation();
  }
  
  // Hugo CLI validation and info
  async validateHugoInstallation(): Promise<boolean> {
    try {
      const { stdout } = await this.execAsync('hugo version');
      this.hugoVersion = stdout.trim();
      console.log(`Hugo CLI detected: ${this.hugoVersion}`);
      return true;
    } catch (error) {
      throw new Error('Hugo CLI not found. Please install Hugo: https://gohugo.io/installation/');
    }
  }
  
  async getHugoVersion(): Promise<string> {
    if (!this.hugoVersion) {
      await this.validateHugoInstallation();
    }
    return this.hugoVersion || 'unknown';
  }
  
  // Site initialization
  async createNewSite(siteName: string, outputDir: string): Promise<string> {
    try {
      const siteDir = path.join(outputDir, siteName);
      
      // Ensure output directory exists
      await this.fileManager.ensureDir(outputDir);
      
      // Create new Hugo site
      const { stdout, stderr } = await this.execAsync(
        `hugo new site "${siteName}"`,
        { cwd: outputDir, timeout: 60000 }
      );
      
      if (stderr && !stderr.includes('Congratulations')) {
        throw new Error(`Hugo site creation failed: ${stderr}`);
      }
      
      console.log(`Hugo site created: ${siteName}`);
      return siteDir;
      
    } catch (error: any) {
      throw new Error(`Failed to create Hugo site: ${error.message}`);
    }
  }
  
  // Content creation
  async createContent(siteDir: string, contentPath: string, frontMatter?: any): Promise<string> {
    try {
      const { stdout, stderr } = await this.execAsync(
        `hugo new "${contentPath}"`,
        { cwd: siteDir, timeout: 30000 }
      );
      
      if (stderr && !stderr.includes('created')) {
        console.warn(`Hugo content creation warning: ${stderr}`);
      }
      
      const fullPath = path.join(siteDir, 'content', contentPath);
      
      // If custom front matter provided, update the file
      if (frontMatter && await this.fileManager.exists(fullPath)) {
        await this.updateContentFrontMatter(fullPath, frontMatter);
      }
      
      return fullPath;
      
    } catch (error: any) {
      // If hugo new fails, create the file manually
      const fullPath = path.join(siteDir, 'content', contentPath);
      await this.fileManager.ensureDir(path.dirname(fullPath));
      
      const defaultContent = this.generateDefaultContent(frontMatter);
      await this.fileManager.writeFile(fullPath, defaultContent);
      
      return fullPath;
    }
  }
  
  // Site building
  async buildSite(siteDir: string, options?: {
    minify?: boolean;
    cleanDestination?: boolean;
    baseURL?: string;
    environment?: string;
  }): Promise<{
    success: boolean;
    buildTime: number;
    outputDir: string;
    errors?: string[];
  }> {
    try {
      const startTime = Date.now();
      
      // Build Hugo command
      let command = 'hugo';
      
      if (options?.minify) command += ' --minify';
      if (options?.cleanDestination) command += ' --cleanDestinationDir';
      if (options?.baseURL) command += ` --baseURL "${options.baseURL}"`;
      if (options?.environment) command += ` --environment ${options.environment}`;
      
      // Execute build
      const { stdout, stderr } = await this.execAsync(command, {
        cwd: siteDir,
        timeout: 120000 // 2 minutes timeout
      });
      
      const buildTime = Date.now() - startTime;
      const outputDir = path.join(siteDir, 'public');
      
      // Check for errors in stderr
      const errors = [];
      if (stderr) {
        const errorLines = stderr.split('\n').filter(line => 
          line.includes('ERROR') || line.includes('FAIL')
        );
        errors.push(...errorLines);
      }
      
      console.log(`Hugo build completed in ${buildTime}ms`);
      
      return {
        success: errors.length === 0,
        buildTime,
        outputDir,
        errors: errors.length > 0 ? errors : undefined
      };
      
    } catch (error: any) {
      throw new Error(`Hugo build failed: ${error.message}`);
    }
  }
  
  // Development server (for testing)
  async startServer(siteDir: string, port: number = 1313): Promise<{
    url: string;
    process: any;
  }> {
    try {
      const command = `hugo server --port ${port} --bind 0.0.0.0 --disableFastRender`;
      
      const serverProcess = spawn('hugo', command.split(' ').slice(1), {
        cwd: siteDir,
        stdio: 'pipe'
      });
      
      // Wait for server to start
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Server start timeout')), 10000);
        
        serverProcess.stdout?.on('data', (data) => {
          if (data.toString().includes('Web Server is available')) {
            clearTimeout(timeout);
            resolve(true);
          }
        });
        
        serverProcess.stderr?.on('data', (data) => {
          console.error(`Hugo server error: ${data.toString()}`);
        });
      });
      
      return {
        url: `http://localhost:${port}`,
        process: serverProcess
      };
      
    } catch (error: any) {
      throw new Error(`Failed to start Hugo server: ${error.message}`);
    }
  }
    // Utility methods
  private async updateContentFrontMatter(filePath: string, frontMatter: any): Promise<void> {
    const content = await this.fileManager.readFile(filePath);
    const lines = content.split('\n');
    
    // Find front matter boundaries
    const frontMatterStart = lines.findIndex((line: string) => line.trim() === '---');
    const frontMatterEnd = lines.findIndex((line: string, index: number) => 
      index > frontMatterStart && line.trim() === '---'
    );
    
    if (frontMatterStart >= 0 && frontMatterEnd > frontMatterStart) {
      // Replace existing front matter
      const newFrontMatter = yaml.dump(frontMatter);
      const newLines = [
        '---',
        ...newFrontMatter.split('\n').filter(line => line.trim()),
        '---',
        ...lines.slice(frontMatterEnd + 1)
      ];
      
      await this.fileManager.writeFile(filePath, newLines.join('\n'));
    }
  }
  
  private generateDefaultContent(frontMatter?: any): string {
    const fm = frontMatter || {
      title: 'New Page',
      date: new Date().toISOString(),
      draft: false
    };
    
    return `---
${yaml.dump(fm).trim()}
---

Content goes here...
`;
  }
}
