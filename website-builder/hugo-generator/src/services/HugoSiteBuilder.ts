import * as path from 'path';
import * as yaml from 'js-yaml';
import { HugoCLI } from './HugoCLI';
import { ThemeInstaller } from './ThemeInstaller';
import { ContentGenerator } from './ContentGenerator';
import { ConfigurationManager } from './ConfigurationManager';
import { FileManager } from '../utils/FileManager';
// Import directly from shared path
import fs from 'fs';
const sharedThemesPath = path.resolve(process.cwd(), '../../shared/constants/themes.js');
// We'll use a require approach to handle paths better
const ThemeConstants = fs.existsSync(sharedThemesPath) ? require(sharedThemesPath) : { 
  VERIFIED_THEMES: [], 
  getThemeById: (id: string) => null 
};

export class HugoSiteBuilder {
  private hugoCLI: HugoCLI;
  private themeInstaller: ThemeInstaller;
  private contentGenerator: ContentGenerator;
  private configManager: ConfigurationManager;
  private fileManager: FileManager;
  private outputDir: string;
  
  constructor() {
    this.hugoCLI = new HugoCLI();
    this.themeInstaller = new ThemeInstaller();
    this.contentGenerator = new ContentGenerator(this.hugoCLI);
    this.configManager = new ConfigurationManager();
    this.fileManager = new FileManager();
    this.outputDir = path.join(process.cwd(), 'output');  }
  
  // Main site building method
  async buildWebsite(request: {
    projectId: string;
    projectData: any;
    generatedContent: any;
    themeConfig: any;
    seoData: any;
    structure: any;
  }): Promise<{
    success: boolean;
    siteUrl?: string;
    sourceUrl?: string;
    buildLog: string[];
    buildTime: number;
    errors: string[];
    metadata: any;
  }> {
    const startTime = Date.now();
    const buildLog: string[] = [];
    const errors: string[] = [];
    let siteDir = '';
    
    try {
      buildLog.push(`[${new Date().toISOString()}] Starting Hugo site generation`);
      buildLog.push(`Project ID: ${request.projectId}`);
      
      // Step 1: Create Hugo site structure
      buildLog.push('Step 1: Creating Hugo site structure...');
      siteDir = await this.createHugoSite(request.projectId, request.projectData);
      buildLog.push(`Hugo site created at: ${siteDir}`);
      
      // Step 2: Install and configure theme
      buildLog.push('Step 2: Installing Hugo theme...');
      const themeResult = await this.installTheme(siteDir, request.themeConfig);
      if (!themeResult.success) {
        errors.push(`Theme installation failed: ${themeResult.error}`);
        throw new Error('Theme installation failed');
      }
      buildLog.push(`Theme installed: ${request.themeConfig.name}`);
      
      // Step 3: Generate site configuration
      buildLog.push('Step 3: Generating site configuration...');
      const configResult = await this.generateConfiguration(
        siteDir,
        request.projectData,
        request.themeConfig,
        request.seoData,
        request.structure
      );
      if (!configResult.success) {
        errors.push(`Configuration generation failed: ${configResult.error}`);
        throw new Error('Configuration generation failed');
      }
      buildLog.push('Site configuration generated');
      // Step 4: Generate content files using structured approach
      buildLog.push('Step 4: Generating content files with structured approach...');
      const contentResult = await this.generateContentStructured(
        siteDir,
        request.generatedContent,
        request.projectData,
        request.seoData,
        request.structure
      );
      if (!contentResult.success) {
        errors.push(...contentResult.errors);
        throw new Error('Content generation failed');
      }
      buildLog.push(`Generated ${contentResult.createdFiles.length} content files`);
      
      // Log page structure plan details
      if (contentResult.pageStructurePlan) {
        const plan = contentResult.pageStructurePlan;
        buildLog.push(`Page structure: ${plan.config.name}`);
        buildLog.push(`  Static pages: ${plan.staticPages.length}`);
        buildLog.push(`  Service pages: ${plan.servicePages.length}`);
        buildLog.push(`  Blog pages: ${plan.blogPages.length}`);
        buildLog.push(`  Total pages: ${plan.totalPages}`);
        buildLog.push(`  Estimated size: ${plan.estimatedContentSize} KB`);
      }
        // Log content tracking details
      if (contentResult.contentTracking) {
        buildLog.push('Content tracking details:');
        contentResult.contentTracking.forEach((track: any) => {
          const status = track.success ? '✅' : '❌';
          buildLog.push(`  ${status} ${track.contentType}: ${track.size} bytes`);
          if (track.error) {
            buildLog.push(`    Error: ${track.error}`);
          }
        });
      }
      
      // Step 5: Copy static assets
      buildLog.push('Step 5: Setting up static assets...');
      await this.setupStaticAssets(siteDir, request.projectData);
      buildLog.push('Static assets configured');
      
      // Step 6: Build Hugo site
      buildLog.push('Step 6: Building Hugo site...');
      const buildResult = await this.buildHugoSite(siteDir);
      if (!buildResult.success) {
        errors.push(...(buildResult.errors || ['Build failed']));
        throw new Error('Hugo build failed');
      }
      buildLog.push(`Site built successfully in ${buildResult.buildTime}ms`);
        // Step 7: Package site for download
      buildLog.push('Step 7: Packaging site for download...');
      const packageResult = await this.packageSite(siteDir, request.projectId);
      buildLog.push(`Built site packaged: ${packageResult.downloadUrl}`);
      buildLog.push(`Source code packaged: ${packageResult.sourceUrl}`);
      
      const totalTime = Date.now() - startTime;
      buildLog.push(`[${new Date().toISOString()}] Site generation completed in ${totalTime}ms`);
      
      return {
        success: true,
        siteUrl: packageResult.downloadUrl,
        sourceUrl: packageResult.sourceUrl,
        buildLog,
        buildTime: totalTime,
        errors,        metadata: {
          theme: request.themeConfig.name,
          contentFiles: contentResult.createdFiles.length,
          contentTracking: contentResult.contentTracking || [],
          buildTime: buildResult.buildTime,
          packageSize: packageResult.fileSize,
          sourceSize: packageResult.sourceSize,
          builtFilename: packageResult.filename,
          sourceFilename: packageResult.sourceFilename,
          hugoVersion: await this.hugoCLI.getHugoVersion()
        }
      };
      
    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      errors.push(error.message);
      buildLog.push(`[${new Date().toISOString()}] Site generation failed: ${error.message}`);
      
      // Cleanup on failure
      if (siteDir) {
        await this.cleanup(siteDir);
      }
      
      return {
        success: false,
        buildLog,
        buildTime: totalTime,
        errors,
        metadata: {}
      };
    }
  }
  
  private async createHugoSite(projectId: string, projectData: any): Promise<string> {
    try {
      const siteName = this.generateSiteName(projectData.businessInfo?.name || projectId);
      const siteDir = await this.hugoCLI.createNewSite(siteName, this.outputDir);
        // Validate site creation
      const configFiles = ['hugo.toml', 'hugo.yaml', 'config.toml', 'config.yaml'];
      const hasConfig = await Promise.all(
        configFiles.map(file => this.fileManager.exists(path.join(siteDir, file)))
      );
      
      if (!hasConfig.some(Boolean)) {
        // Create basic config if none exists
        const basicConfig = {
          baseURL: 'https://example.com',
          languageCode: 'en-us',
          title: projectData.businessInfo?.name || 'My Website'
        };
        
        const configPath = path.join(siteDir, 'hugo.yaml');
        await this.fileManager.writeFile(configPath, yaml.dump(basicConfig));
      }
      
      return siteDir;
      
    } catch (error: any) {
      throw new Error(`Hugo site creation failed: ${error.message}`);
    }
  }
  private async installTheme(siteDir: string, themeConfig: any): Promise<any> {
    try {
      // Define a theme type that matches both sources
      type Theme = {
        id: string;
        name: string;
        githubUrl: string;
      };
      
      // Get theme configuration from verified themes (shared constants)
      const verifiedThemes: Theme[] = ThemeConstants.VERIFIED_THEMES || this.themeInstaller.getPopularThemes();
      
      // If hugoTheme is specified, use it directly
      let selectedTheme: Theme | undefined;
      
      if (themeConfig.hugoTheme) {
        // Direct theme selection
        selectedTheme = verifiedThemes.find((theme: Theme) => theme.id === themeConfig.hugoTheme);
      } else {
        // Auto-detected theme (from themeConfig.id)
        selectedTheme = verifiedThemes.find((theme: Theme) => theme.id === themeConfig.id);
      }
      
      // Fallback to default theme if not found
      if (!selectedTheme) {
        console.warn(`Theme ${themeConfig.id || themeConfig.hugoTheme} not found, using default theme`);
        selectedTheme = verifiedThemes.find((theme: Theme) => theme.id === 'ananke') || verifiedThemes[0];
      }
      
      console.log(`Installing theme: ${selectedTheme.name} (${selectedTheme.id})`);
      
      // Install theme
      const installResult = await this.themeInstaller.installTheme(siteDir, selectedTheme);
      
      if (!installResult.success) {
        // Try fallback theme if primary fails
        console.warn(`Primary theme failed, trying fallback...`);
        const fallbackTheme = verifiedThemes.find((theme: Theme) => theme.id === 'ananke') ||
                            verifiedThemes[0];
        
        return await this.themeInstaller.installTheme(siteDir, fallbackTheme);
      }
      
      return installResult;
      
    } catch (error: any) {
      throw new Error(`Theme installation failed: ${error.message}`);
    }
  }
  
  private async generateConfiguration(
    siteDir: string,
    projectData: any,
    themeConfig: any,
    seoData: any,
    structure: any
  ): Promise<any> {
    return await this.configManager.generateHugoConfig(
      siteDir,
      projectData,
      themeConfig,
      seoData,
      structure
    );
  }
    private async generateContent(
    siteDir: string,
    generatedContent: any,
    projectData: any,
    seoData: any,
    structure: any
  ): Promise<any> {
    console.log(`[CONTENT TRACKING] Starting content generation for site: ${siteDir}`);
    console.log(`[CONTENT TRACKING] Generated content keys: ${Object.keys(generatedContent || {})}`);
    
    try {
      // Enhanced content generation with detailed tracking
      const result = await this.contentGenerator.generateAllContent(
        siteDir,
        generatedContent,
        projectData,
        seoData,
        structure
      );
      
      // Additional content validation and tracking
      const contentDir = path.join(siteDir, 'content');
      console.log(`[CONTENT TRACKING] Content directory: ${contentDir}`);
      
      if (await this.fileManager.exists(contentDir)) {
        const contentFiles = await this.fileManager.readDir(contentDir);
        console.log(`[CONTENT TRACKING] Content files created: ${contentFiles.length}`);
        
        // Log each content file with details
        for (const file of contentFiles) {
          const filePath = path.join(contentDir, file);
          if (await this.fileManager.exists(filePath)) {
            const stats = await this.fileManager.getStats(filePath);
            console.log(`[CONTENT TRACKING] File: ${file} - Size: ${stats.size} bytes`);
          }
        }
      } else {
        console.warn(`[CONTENT TRACKING] WARNING: Content directory not found: ${contentDir}`);
      }
      
      return result;
    } catch (error: any) {
      console.error(`[CONTENT TRACKING] Content generation failed: ${error.message}`);
      throw error;
    }
  }
    /**
   * Generate content using structured page configuration approach
   */
  private async generateContentStructured(
    siteDir: string,
    generatedContent: any,
    projectData: any,
    seoData: any,
    structure: any
  ): Promise<any> {
    console.log(`[STRUCTURED CONTENT] Starting structured content generation for site: ${siteDir}`);
    console.log(`[STRUCTURED CONTENT] Generated content keys: ${Object.keys(generatedContent || {})}`);
    
    try {
      // Use the new structured content generation method
      const result = await this.contentGenerator.generateContentFilesStructured(
        siteDir,
        generatedContent,
        projectData,
        seoData,
        structure
      );
      
      // Additional validation and tracking
      const contentDir = path.join(siteDir, 'content');
      console.log(`[STRUCTURED CONTENT] Content directory: ${contentDir}`);
      
      if (await this.fileManager.exists(contentDir)) {
        const contentFiles = await this.fileManager.readDir(contentDir);
        console.log(`[STRUCTURED CONTENT] Content files created: ${contentFiles.length}`);
        
        // Log each content file with details
        for (const file of contentFiles) {
          const filePath = path.join(contentDir, file);
          if (await this.fileManager.exists(filePath)) {
            const stats = await this.fileManager.getStats(filePath);
            console.log(`[STRUCTURED CONTENT] File: ${file} - Size: ${stats.size} bytes`);
          }
        }
      } else {
        console.warn(`[STRUCTURED CONTENT] WARNING: Content directory not found: ${contentDir}`);
      }
      
      console.log(`[STRUCTURED CONTENT] Generation completed successfully`);
      if (result.pageStructurePlan) {
        console.log(`[STRUCTURED CONTENT] Used page structure: ${result.pageStructurePlan.config.name}`);
      }
      
      return result;
    } catch (error: any) {
      console.error(`[STRUCTURED CONTENT] Structured content generation failed: ${error.message}`);
      console.error(`[STRUCTURED CONTENT] Error details:`, error);
      throw error;
    }
  }
    private async setupStaticAssets(siteDir: string, projectData: any): Promise<void> {
    try {
      const staticDir = path.join(siteDir, 'static');
      await this.fileManager.ensureDir(staticDir);
      
      // Create basic directory structure
      const assetDirs = ['images', 'css', 'js', 'fonts'];
      for (const dir of assetDirs) {
        await this.fileManager.ensureDir(path.join(staticDir, dir));
      }
      
      // Create robots.txt
      const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://example.com/sitemap.xml`;
      
      await this.fileManager.writeFile(path.join(staticDir, 'robots.txt'), robotsTxt);
      
      // Create basic favicon (placeholder)
      const faviconContent = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" fill="#3B82F6"/>
  <text x="16" y="20" font-family="Arial" font-size="18" fill="white" text-anchor="middle">W</text>
</svg>`;
      
      await this.fileManager.writeFile(path.join(staticDir, 'favicon.svg'), faviconContent);
      
    } catch (error: any) {
      console.warn(`Static assets setup warning: ${error.message}`);
    }
  }
    private async buildHugoSite(siteDir: string): Promise<any> {
    try {
      const buildResult = await this.hugoCLI.buildSite(siteDir, {
        minify: true,
        cleanDestination: true,
        environment: 'production'
      });
      
      // Validate build output
      const publicDir = path.join(siteDir, 'public');
      const indexFile = path.join(publicDir, 'index.html');
      
      if (!await this.fileManager.exists(indexFile)) {
        throw new Error('Build completed but no index.html found');
      }
      
      return buildResult;
      
    } catch (error: any) {
      throw new Error(`Hugo build failed: ${error.message}`);
    }
  }
    private async packageSite(siteDir: string, projectId: string): Promise<{
    downloadUrl: string;
    sourceUrl: string;
    fileSize: number;
    sourceSize: number;
    filename: string;
    sourceFilename: string;
  }> {
    try {
      const publicDir = path.join(siteDir, 'public');
      const packageDir = path.join(process.cwd(), 'packages');
      await this.fileManager.ensureDir(packageDir);
      
      const timestamp = Date.now();
      const builtFilename = `website-built-${projectId}-${timestamp}.zip`;
      const sourceFilename = `website-source-${projectId}-${timestamp}.zip`;
      
      const builtZipPath = path.join(packageDir, builtFilename);
      const sourceZipPath = path.join(packageDir, sourceFilename);
      
      // Create archiver instances
      const archiver = require('archiver');
      const fs = require('fs');
      
      // Package 1: Built site (public directory)
      console.log(`[PACKAGING] Creating built site package: ${builtFilename}`);
      const builtOutput = fs.createWriteStream(builtZipPath);
      const builtArchive = archiver('zip', { zlib: { level: 9 } });
      
      builtArchive.pipe(builtOutput);
      builtArchive.directory(publicDir, false);
      
      await new Promise<void>((resolve, reject) => {
        builtOutput.on('close', () => resolve());
        builtArchive.on('error', reject);
        builtArchive.finalize();
      });
      
      // Package 2: Full Hugo source code
      console.log(`[PACKAGING] Creating source code package: ${sourceFilename}`);
      const sourceOutput = fs.createWriteStream(sourceZipPath);
      const sourceArchive = archiver('zip', { zlib: { level: 9 } });
      
      sourceArchive.pipe(sourceOutput);
      
      // Add all Hugo source files except node_modules and .git
      sourceArchive.glob('**/*', {
        cwd: siteDir,
        ignore: [
          'node_modules/**',
          '.git/**',
          '.gitignore',
          'public/**', // Exclude built files from source package
          'resources/_gen/**', // Exclude Hugo generated resources
          '.hugo_build.lock'
        ]
      });
      
      await new Promise<void>((resolve, reject) => {
        sourceOutput.on('close', () => resolve());
        sourceArchive.on('error', reject);
        sourceArchive.finalize();
      });
      
      // Get file sizes
      const builtStats = await this.fileManager.getStats(builtZipPath);
      const sourceStats = await this.fileManager.getStats(sourceZipPath);
      
      // Generate download URLs
      const downloadUrl = `/packages/${builtFilename}`;
      const sourceUrl = `/packages/${sourceFilename}`;
      
      console.log(`[PACKAGING] Built site package: ${builtStats.size} bytes`);
      console.log(`[PACKAGING] Source code package: ${sourceStats.size} bytes`);
      
      return {
        downloadUrl,
        sourceUrl,
        fileSize: builtStats.size,
        sourceSize: sourceStats.size,
        filename: builtFilename,
        sourceFilename
      };
      
    } catch (error: any) {
      throw new Error(`Site packaging failed: ${error.message}`);
    }
  }
    private async cleanup(siteDir: string): Promise<void> {
    try {
      if (await this.fileManager.exists(siteDir)) {
        await this.fileManager.remove(siteDir);
        console.log(`Cleaned up site directory: ${siteDir}`);
      }
    } catch (error: any) {
      console.warn(`Cleanup warning: ${error.message}`);
    }
  }
  
  private generateSiteName(businessName?: string): string {
    const base = businessName 
      ? businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')
      : 'website';
    
    const timestamp = Date.now();
    return `${base}-${timestamp}`;
  }
  
  // Health check and utilities
  async healthCheck(): Promise<{
    hugoAvailable: boolean;
    hugoVersion?: string;
    outputDirWritable: boolean;
    themes: number;
  }> {
    try {
      const hugoAvailable = await this.hugoCLI.validateHugoInstallation();
      const hugoVersion = await this.hugoCLI.getHugoVersion();
        // Check output directory
      await this.fileManager.ensureDir(this.outputDir);
      const outputDirWritable = await this.fileManager.exists(this.outputDir);
      
      const themes = this.themeInstaller.getPopularThemes().length;
      
      return {
        hugoAvailable,
        hugoVersion,
        outputDirWritable,
        themes
      };
      
    } catch (error: any) {
      return {
        hugoAvailable: false,
        outputDirWritable: false,
        themes: 0
      };
    }
  }
}
