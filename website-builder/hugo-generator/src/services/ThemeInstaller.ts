import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import axios from 'axios';
import { FileManager } from '../utils/FileManager';
// Import shared theme constants
import fs from 'fs';
const sharedThemesPath = path.resolve(process.cwd(), '../../shared/constants/themes.js');
// We'll use a require approach to handle paths better
const ThemeConstants = fs.existsSync(sharedThemesPath) ? require(sharedThemesPath) : { 
  VERIFIED_THEMES: []
};

export class ThemeInstaller {
  private execAsync = promisify(exec);
  private tempDir: string;
  private fileManager: FileManager;
  
  constructor() {
    this.fileManager = new FileManager();
    this.tempDir = path.join(process.cwd(), 'temp', 'themes');
  }
  
  // Theme installation from GitHub
  async installTheme(
    siteDir: string, 
    themeConfig: {
      id: string;
      githubUrl: string;
      name: string;
    }
  ): Promise<{
    success: boolean;
    themePath: string;
    error?: string;
  }> {
    try {
      const themesDir = path.join(siteDir, 'themes');
      const themePath = path.join(themesDir, themeConfig.name);
      
      await this.fileManager.ensureDir(themesDir);
      
      // Try git clone first (faster and gets latest version)
      try {
        await this.cloneThemeFromGit(themeConfig.githubUrl, themePath);
      } catch (gitError: any) {
        console.warn(`Git clone failed, trying ZIP download: ${gitError.message}`);
        await this.downloadThemeAsZip(themeConfig.githubUrl, themePath);
      }
      
      // Verify theme installation
      const isValid = await this.validateThemeInstallation(themePath);
      if (!isValid) {
        throw new Error('Theme validation failed after installation');
      }
      
      console.log(`Theme installed successfully: ${themeConfig.name}`);
      
      return {
        success: true,
        themePath
      };
      
    } catch (error: any) {
      return {
        success: false,
        themePath: '',
        error: error.message
      };
    }
  }
  
  private async cloneThemeFromGit(githubUrl: string, themePath: string): Promise<void> {
    try {
      // Clone with depth 1 for faster download
      const { stdout, stderr } = await this.execAsync(
        `git clone --depth 1 "${githubUrl}" "${themePath}"`,
        { timeout: 60000 }
      );
        // Remove .git directory to avoid conflicts
      const gitDir = path.join(themePath, '.git');
      if (await this.fileManager.exists(gitDir)) {
        await this.fileManager.remove(gitDir);
      }
      
    } catch (error: any) {
      throw new Error(`Git clone failed: ${error.message}`);
    }
  }
  
  private async downloadThemeAsZip(githubUrl: string, themePath: string): Promise<void> {
    try {
      // Convert GitHub URL to ZIP download URL
      const zipUrl = githubUrl.replace(/\.git$/, '') + '/archive/refs/heads/main.zip';
        // Download ZIP file
      const response = await axios.get(zipUrl, { responseType: 'arraybuffer' });
      
      // Extract ZIP to temporary location
      const tempZipPath = path.join(this.tempDir, `theme-${Date.now()}.zip`);
      await this.fileManager.ensureDir(path.dirname(tempZipPath));
      await this.fileManager.writeBinaryFile(tempZipPath, response.data);
      
      // Extract ZIP
      await this.extractZip(tempZipPath, themePath);
      
      // Clean up
      await this.fileManager.remove(tempZipPath);
      
    } catch (error: any) {
      throw new Error(`ZIP download failed: ${error.message}`);
    }
  }
  
  private async extractZip(zipPath: string, extractPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const yauzl = require('yauzl');
      
      yauzl.open(zipPath, { lazyEntries: true }, (err: any, zipfile: any) => {
        if (err) return reject(err);
        
        zipfile.readEntry();
        zipfile.on('entry', (entry: any) => {
          if (/\/$/.test(entry.fileName)) {
            // Directory entry
            zipfile.readEntry();
          } else {
            // File entry - skip the first directory level (GitHub adds repo name)
            const pathParts = entry.fileName.split('/');
            const relativePath = pathParts.slice(1).join('/');
            
            if (relativePath) {
              zipfile.openReadStream(entry, (err: any, readStream: any) => {
                if (err) return reject(err);
                  const outputPath = path.join(extractPath, relativePath);
                this.fileManager.ensureDir(path.dirname(outputPath)).then(() => {
                  const writeStream = require('fs').createWriteStream(outputPath);
                  readStream.pipe(writeStream);
                  writeStream.on('close', () => zipfile.readEntry());
                  writeStream.on('error', reject);
                });
              });
            } else {
              zipfile.readEntry();
            }
          }
        });
        
        zipfile.on('end', () => resolve());
        zipfile.on('error', reject);
      });
    });
  }
  
  private async validateThemeInstallation(themePath: string): Promise<boolean> {
    try {
      // Check for required theme files
      const requiredFiles = [
        'theme.toml',
        'theme.yaml',
        'config.toml',
        'config.yaml',
        'layouts'
      ];
        for (const file of requiredFiles) {
        const filePath = path.join(themePath, file);
        if (await this.fileManager.exists(filePath)) {
          return true; // At least one required file exists
        }
      }
      
      // Check for layouts directory
      const layoutsDir = path.join(themePath, 'layouts');
      if (await this.fileManager.exists(layoutsDir)) {
        return true;
      }
      
      return false;
      
    } catch (error: any) {
      return false;
    }
  }
    // Get popular Hugo themes configuration
  getPopularThemes(): Array<{
    id: string;
    name: string;
    displayName: string;
    githubUrl: string;
    category: string;
    suitableFor: string[];
  }> {
    // First try to use shared theme constants
    if (ThemeConstants.VERIFIED_THEMES && ThemeConstants.VERIFIED_THEMES.length > 0) {
      return ThemeConstants.VERIFIED_THEMES.map((theme: any) => ({
        id: theme.id,
        name: theme.name,
        displayName: theme.displayName,
        githubUrl: theme.githubUrl,
        category: theme.categories[0] || 'business',
        suitableFor: theme.websiteTypes || []
      }));
    }
    
    // Fallback to hardcoded themes
    return [
      {
        id: 'papermod',
        name: 'PaperMod',
        displayName: 'PaperMod - Modern Blog Theme',
        githubUrl: 'https://github.com/adityatelange/hugo-PaperMod.git',
        category: 'blog',
        suitableFor: ['blog', 'personal', 'business']
      },
      {
        id: 'ananke',
        name: 'ananke',
        displayName: 'Ananke - Versatile Business Theme',
        githubUrl: 'https://github.com/theNewDynamic/gohugo-theme-ananke.git',
        category: 'business',
        suitableFor: ['business', 'portfolio', 'blog']
      },
      {
        id: 'mainroad',
        name: 'Mainroad',
        displayName: 'Mainroad - Magazine Style',
        githubUrl: 'https://github.com/Vimux/Mainroad.git',
        category: 'blog',
        suitableFor: ['blog', 'news', 'magazine']
      },
      {
        id: 'clarity',
        name: 'hugo-clarity',
        displayName: 'Clarity - Tech Blog Theme',
        githubUrl: 'https://github.com/chipzoller/hugo-clarity.git',
        category: 'tech',
        suitableFor: ['blog', 'tech', 'personal']
      },
      {
        id: 'terminal',
        name: 'terminal',
        displayName: 'Terminal - Developer Theme',
        githubUrl: 'https://github.com/panr/hugo-theme-terminal.git',
        category: 'tech',
        suitableFor: ['developer', 'tech', 'personal']
      }
    ];
  }
}
