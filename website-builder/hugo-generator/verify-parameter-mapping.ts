/**
 * Verify Generated Hugo Configuration with Parameter Mapping
 */

import { ConfigurationManager } from './src/services/ConfigurationManager';
import * as path from 'path';
import * as fs from 'fs';

async function verifyParameterMappingOutput() {
  console.log('🔍 Verifying Hugo Configuration with Enhanced Parameter Mapping\n');

  const enhancedThemeConfig = {
    id: 'health-wellness-theme',
    name: 'health-wellness-theme',
    displayName: 'Health & Wellness Theme',
    isLocal: true,
    features: ['appointment-booking', 'service-showcase', 'testimonials'],
    parameterMapping: {
      primaryColor: '#0369a1',
      secondaryColor: '#059669',
      contactPhone: '555-123-4567',
      contactEmail: 'info@downtowndental.com',
      businessName: 'Downtown Dental Clinic',
      businessAddress: '123 Main Street, Downtown, State 12345',
      showAppointmentCta: true,
      showTestimonials: true,
      emergencyAvailable: true
    }
  };

  const healthcareWizardData = {
    businessInfo: { name: 'Downtown Dental Clinic' },
    locationInfo: { contactInfo: { phone: '555-123-4567', email: 'info@downtowndental.com' } },
    themeConfig: enhancedThemeConfig
  };

  try {
    const configManager = new ConfigurationManager();
    const testSiteDir = path.join(process.cwd(), 'temp', 'verify-config');
    
    if (!fs.existsSync(testSiteDir)) {
      fs.mkdirSync(testSiteDir, { recursive: true });
    }

    const result = await configManager.generateHugoConfig(
      testSiteDir,
      healthcareWizardData,
      enhancedThemeConfig,
      { title: 'Test Clinic' },
      { type: 'multi-page' }
    );

    if (result.success && fs.existsSync(result.configPath)) {
      const configContent = fs.readFileSync(result.configPath, 'utf8');
      
      console.log('📄 Generated Hugo Configuration (hugo.yaml):');
      console.log('=' .repeat(60));
      console.log(configContent);
      console.log('=' .repeat(60));
      
      // Verify specific parameters
      const parameterChecks = [
        { key: 'primaryColor', expected: '#0369a1' },
        { key: 'contactPhone', expected: '555-123-4567' },
        { key: 'businessName', expected: 'Downtown Dental Clinic' },
        { key: 'showAppointmentCta', expected: 'true' },
        { key: 'theme', expected: 'health-wellness-theme' }
      ];

      console.log('\n🔍 Parameter Verification:');
      parameterChecks.forEach(check => {
        const found = configContent.includes(check.expected);
        console.log(`   ${check.key}: ${found ? '✅' : '❌'} ${found ? 'FOUND' : 'MISSING'}`);
      });

      // Count enhanced parameters
      const enhancedParams = Object.keys(enhancedThemeConfig.parameterMapping);
      const foundParams = enhancedParams.filter(param => {
        const value = (enhancedThemeConfig.parameterMapping as any)[param];
        return configContent.includes(String(value));
      });

      console.log(`\n📊 Enhanced Parameter Coverage: ${foundParams.length}/${enhancedParams.length} parameters applied`);
      
      if (foundParams.length === enhancedParams.length) {
        console.log('🎉 ALL enhanced parameters successfully applied to Hugo configuration!');
      } else {
        console.log('⚠️ Some enhanced parameters may be missing');
      }
    }

    // Cleanup
    if (fs.existsSync(testSiteDir)) {
      fs.rmSync(testSiteDir, { recursive: true, force: true });
    }

  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
  }
}

// Run verification
verifyParameterMappingOutput().catch(console.error);
