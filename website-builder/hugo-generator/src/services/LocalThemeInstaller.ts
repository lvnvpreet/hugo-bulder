import * as path from 'path';
import { FileManager } from '../utils/FileManager';

/**
 * Local Theme Installer for custom themes in /themes directory
 * Handles installation of themes from the local themes folder
 */
export class LocalThemeInstaller {
  private fileManager: FileManager;
  
  constructor() {
    this.fileManager = new FileManager();
  }

  /**
   * Install theme from local themes directory
   */
  async installLocalTheme(
    siteDir: string, 
    themeId: string
  ): Promise<{
    success: boolean;
    themePath: string;
    error?: string;
  }> {
    try {
      console.log(`🎨 Installing local theme: ${themeId}`);
      
      // Path to local themes directory (from project root)
      // From hugo-generator -> website-builder -> hugo-bulder -> themes
      const localThemesDir = path.resolve(process.cwd(), '../../themes');
      const sourceThemePath = path.join(localThemesDir, themeId);
      
      // Target themes directory in Hugo site
      const targetThemesDir = path.join(siteDir, 'themes');
      const targetThemePath = path.join(targetThemesDir, themeId);
      
      console.log(`📁 Source: ${sourceThemePath}`);
      console.log(`📁 Target: ${targetThemePath}`);
      
      // Verify source theme exists
      if (!await this.fileManager.exists(sourceThemePath)) {
        const error = `Local theme not found: ${sourceThemePath}`;
        console.error(`❌ ${error}`);
        return {
          success: false,
          themePath: '',
          error
        };
      }

      // Ensure target themes directory exists
      await this.fileManager.ensureDir(targetThemesDir);
      
      // Remove existing theme if it exists
      if (await this.fileManager.exists(targetThemePath)) {
        console.log(`🗑️ Removing existing theme at: ${targetThemePath}`);
        await this.fileManager.remove(targetThemePath);
      }
      
      // Copy theme from local themes directory
      console.log(`📋 Copying theme files...`);
      await this.copyThemeDirectory(sourceThemePath, targetThemePath);
      
      // Validate theme installation
      const isValid = await this.validateThemeInstallation(targetThemePath);
      
      if (!isValid) {
        const error = 'Theme validation failed after installation';
        console.error(`❌ ${error}`);
        return {
          success: false,
          themePath: '',
          error
        };
      }
      
      console.log(`✅ Local theme installed successfully: ${themeId}`);
      
      return {
        success: true,
        themePath: targetThemePath
      };
      
    } catch (error: any) {
      console.error(`❌ Local theme installation failed: ${error.message}`);
      return {
        success: false,
        themePath: '',
        error: error.message
      };
    }
  }

  /**
   * Copy theme directory recursively
   */
  private async copyThemeDirectory(sourcePath: string, targetPath: string): Promise<void> {
    try {
      const entries = await this.fileManager.readDir(sourcePath);
      
      await this.fileManager.ensureDir(targetPath);
      
      for (const entry of entries) {
        const sourceEntryPath = path.join(sourcePath, entry);
        const targetEntryPath = path.join(targetPath, entry);
        
        const stats = await this.fileManager.getStats(sourceEntryPath);
        
        if (stats.isDirectory()) {
          // Recursively copy directory
          await this.copyThemeDirectory(sourceEntryPath, targetEntryPath);
        } else {
          // Copy file
          console.log(`📄 Copying: ${entry}`);
          const content = await this.fileManager.readFile(sourceEntryPath);
          await this.fileManager.writeFile(targetEntryPath, content);
        }
      }
    } catch (error: any) {
      throw new Error(`Failed to copy theme directory: ${error.message}`);
    }
  }

  /**
   * Validate theme installation
   */
  private async validateThemeInstallation(themePath: string): Promise<boolean> {
    try {
      console.log(`🔍 Validating theme installation: ${themePath}`);
      
      // Check for required theme files
      const requiredFiles = [
        'theme.toml',
        'theme.yaml', 
        'config.toml',
        'config.yaml'
      ];
      
      let hasConfigFile = false;
      for (const file of requiredFiles) {
        const filePath = path.join(themePath, file);
        if (await this.fileManager.exists(filePath)) {
          console.log(`✅ Found config file: ${file}`);
          hasConfigFile = true;
          break;
        }
      }
      
      // Check for layouts directory (essential for Hugo themes)
      const layoutsDir = path.join(themePath, 'layouts');
      const hasLayouts = await this.fileManager.exists(layoutsDir);
      
      if (hasLayouts) {
        console.log(`✅ Found layouts directory`);
      } else {
        console.log(`❌ Missing layouts directory`);
      }
      
      // Theme is valid if it has layouts directory (config file is optional)
      const isValid = hasLayouts;
      
      console.log(`🎯 Theme validation result: ${isValid ? 'VALID' : 'INVALID'}`);
      
      return isValid;
      
    } catch (error: any) {
      console.error(`❌ Theme validation error: ${error.message}`);
      return false;
    }
  }

  /**
   * List available local themes
   */
  async getAvailableLocalThemes(): Promise<Array<{
    id: string;
    name: string;
    path: string;
    metadata?: any;
  }>> {
    try {
      const localThemesDir = path.resolve(process.cwd(), '../../../themes');
      console.log(`📁 Scanning local themes directory: ${localThemesDir}`);
      
      if (!await this.fileManager.exists(localThemesDir)) {
        console.log(`⚠️ Local themes directory not found: ${localThemesDir}`);
        return [];
      }
      
      const entries = await this.fileManager.readDir(localThemesDir);
      const themes: Array<{
        id: string;
        name: string;
        path: string;
        metadata?: any;
      }> = [];
      
      for (const entry of entries) {
        const themePath = path.join(localThemesDir, entry);
        const stats = await this.fileManager.getStats(themePath);
        
        if (stats.isDirectory()) {
          const isValid = await this.validateThemeInstallation(themePath);
          
          if (isValid) {
            const metadata = await this.loadThemeMetadata(themePath);
            
            themes.push({
              id: entry,
              name: metadata?.name || entry,
              path: themePath,
              metadata
            });
            
            console.log(`✅ Found valid local theme: ${entry}`);
          } else {
            console.log(`⚠️ Invalid theme skipped: ${entry}`);
          }
        }
      }
      
      console.log(`🎯 Found ${themes.length} valid local themes`);
      return themes;
      
    } catch (error: any) {
      console.warn(`Could not list local themes: ${error.message}`);
      return [];
    }
  }

  /**
   * Load theme metadata from theme.toml or theme.yaml
   */
  private async loadThemeMetadata(themePath: string): Promise<any> {
    try {
      // Try theme.toml first
      const themeTomlPath = path.join(themePath, 'theme.toml');
      if (await this.fileManager.exists(themeTomlPath)) {
        const tomlContent = await this.fileManager.readFile(themeTomlPath);
        return this.parseToml(tomlContent);
      }
      
      // Try theme.yaml
      const themeYamlPath = path.join(themePath, 'theme.yaml');
      if (await this.fileManager.exists(themeYamlPath)) {
        const yamlContent = await this.fileManager.readFile(themeYamlPath);
        return this.parseYaml(yamlContent);
      }
      
      return {};
    } catch (error: any) {
      console.warn(`Could not load theme metadata: ${error.message}`);
      return {};
    }
  }

  /**
   * Simple TOML parser for theme metadata
   */
  private parseToml(content: string): any {
    try {
      const lines = content.split('\n');
      const metadata: any = {};
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=').trim().replace(/['"]/g, '');
          metadata[key.trim()] = value;
        }
      }
      
      return metadata;
    } catch (error: any) {
      console.warn(`TOML parsing error: ${error.message}`);
      return {};
    }
  }

  /**
   * Simple YAML parser for theme metadata  
   */
  private parseYaml(content: string): any {
    try {
      // For now, use a simple parser. Could be enhanced with proper YAML library
      const lines = content.split('\n');
      const metadata: any = {};
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes(':')) {
          const [key, ...valueParts] = trimmed.split(':');
          const value = valueParts.join(':').trim().replace(/['"]/g, '');
          metadata[key.trim()] = value;
        }
      }
      
      return metadata;
    } catch (error: any) {
      console.warn(`YAML parsing error: ${error.message}`);
      return {};
    }
  }

  /**
   * Check if a theme is available locally
   */
  async isThemeAvailableLocally(themeId: string): Promise<boolean> {
    try {
      const localThemesDir = path.resolve(process.cwd(), '../../themes');
      const themePath = path.join(localThemesDir, themeId);
      
      if (!await this.fileManager.exists(themePath)) {
        return false;
      }
      
      return await this.validateThemeInstallation(themePath);
    } catch (error: any) {
      return false;
    }
  }
}
