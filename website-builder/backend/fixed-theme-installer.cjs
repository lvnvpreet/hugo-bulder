const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

/**
 * Fixed theme installation method for WebsiteGenerationService
 * This replaces the problematic installHugoTheme method
 */
async function installTheme(siteDir, themeName) {
  const themesDir = path.join(siteDir, 'themes');
  const themeDir = path.join(themesDir, themeName);
  
  console.log(`🎨 Installing theme: ${themeName}`);
  console.log(`📁 Site directory: ${siteDir}`);
  console.log(`📁 Theme directory: ${themeDir}`);
  
  try {
    // Ensure themes directory exists
    await fs.ensureDir(themesDir);
    console.log('✅ Created themes directory');
    
    // Handle different theme types
    if (themeName === 'default-hugo') {
      console.log('📦 Using default Hugo theme - no installation required');
      return { success: true, message: 'Default Hugo theme configured' };
    }
    
    // Check if theme already exists
    if (await fs.pathExists(themeDir)) {
      console.log('⚠️  Theme directory already exists, cleaning up...');
      await fs.remove(themeDir);
    }
    
    // Theme repository mapping
    const themeRepos = {
      'health-wellness-theme': 'https://github.com/lvnvpreet/health-wellness-theme.git',
      'ananke': 'https://github.com/theNewDynamic/gohugo-theme-ananke.git',
      'papermod': 'https://github.com/adityatelange/hugo-PaperMod.git',
      'bigspring': 'https://github.com/themefisher/bigspring-hugo.git',
      'restaurant': 'https://github.com/themefisher/restaurant-hugo.git',
      'hargo': 'https://github.com/themefisher/hargo.git',
      'terminal': 'https://github.com/panr/hugo-theme-terminal.git',
      'clarity': 'https://github.com/chipzoller/hugo-clarity.git',
      'mainroad': 'https://github.com/vimux/mainroad.git'
    };
    
    const repoUrl = themeRepos[themeName];
    if (!repoUrl) {
      throw new Error(`Unknown theme: ${themeName}. Available themes: ${Object.keys(themeRepos).join(', ')}`);
    }
    
    console.log(`🌐 Cloning theme from: ${repoUrl}`);
    
    // Clone with timeout and error handling
    const cloneCommand = `git clone --depth 1 "${repoUrl}" "${themeDir}"`;
    console.log(`🔧 Executing: ${cloneCommand}`);
    
    execSync(cloneCommand, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60000, // 60 second timeout
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0' // Disable interactive prompts
      }
    });
    
    console.log('✅ Theme cloned successfully');
    
    // Verify theme was installed correctly
    const themeExists = await fs.pathExists(themeDir);
    const layoutsExist = await fs.pathExists(path.join(themeDir, 'layouts'));
    
    if (!themeExists) {
      throw new Error('Theme directory was not created');
    }
    
    if (!layoutsExist) {
      console.log('⚠️  Warning: Theme does not have layouts directory');
    }
    
    // Remove .git directory for cleaner deployment
    const gitDir = path.join(themeDir, '.git');
    if (await fs.pathExists(gitDir)) {
      await fs.remove(gitDir);
      console.log('🧹 Removed .git directory');
    }
    
    // List theme contents for verification
    const themeContents = await fs.readdir(themeDir);
    console.log('📁 Theme contents:', themeContents);
    
    console.log(`🎨 Theme ${themeName} installed successfully`);
    return { 
      success: true, 
      message: `Theme ${themeName} installed successfully`,
      themeDir,
      contents: themeContents
    };
    
  } catch (error) {
    console.error(`❌ Failed to install theme ${themeName}:`, error.message);
    
    // Clean up on failure
    try {
      if (await fs.pathExists(themeDir)) {
        await fs.remove(themeDir);
        console.log('🧹 Cleaned up failed installation');
      }
    } catch (cleanupError) {
      console.error('⚠️  Cleanup error:', cleanupError.message);
    }
    
    throw new Error(`Failed to install theme ${themeName}: ${error.message}`);
  }
}

/**
 * Test the installation method
 */
async function testInstallation() {
  const testSiteDir = path.join(__dirname, 'test-site');
  
  try {
    console.log('🧪 Testing theme installation method...');
    
    // Clean up any existing test site
    if (await fs.pathExists(testSiteDir)) {
      await fs.remove(testSiteDir);
    }
    
    // Create test site directory
    await fs.ensureDir(testSiteDir);
    
    // Test health-wellness-theme installation
    const result = await installTheme(testSiteDir, 'health-wellness-theme');
    console.log('✅ Installation result:', result);
    
    // Clean up
    await fs.remove(testSiteDir);
    console.log('🧹 Test completed and cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Clean up on error
    if (await fs.pathExists(testSiteDir)) {
      await fs.remove(testSiteDir);
    }
  }
}

// Export for use in other modules
module.exports = { installTheme };

// Run test if this file is executed directly
if (require.main === module) {
  testInstallation().catch(console.error);
}
