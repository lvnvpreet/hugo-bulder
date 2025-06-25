#!/usr/bin/env node

/**
 * Test script to verify the enhanced Hugo site builder functionality
 * Tests content tracking and dual packaging (built site + source code)
 */

const { HugoSiteBuilder } = require('./src/services/HugoSiteBuilder');
const path = require('path');

async function testEnhancedFeatures() {
  console.log('🧪 Testing Enhanced Hugo Site Builder Features');
  console.log('==============================================');
  
  const builder = new HugoSiteBuilder();
  
  // Test 1: Health Check
  console.log('\n📊 Test 1: Health Check');
  try {
    const health = await builder.healthCheck();
    console.log('✅ Health check passed:', health);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
  
  // Test 2: Build with Enhanced Tracking
  console.log('\n🏗️  Test 2: Build Website with Enhanced Features');
  
  const testRequest = {
    projectId: 'test-enhanced-features',
    projectData: {
      businessInfo: {
        name: 'Test Enhanced Website',
        description: 'Testing enhanced content tracking and packaging'
      },
      selectedServices: ['web-development', 'consulting']
    },
    generatedContent: {
      homepage: {
        hero_title: 'Enhanced Test Website',
        hero_description: 'Testing content tracking and dual packaging',
        sections: [
          {
            type: 'hero',
            title: 'Welcome to Enhanced Features',
            description: 'This is a test of enhanced content tracking'
          }
        ]
      },
      about: {
        title: 'About Enhanced Features',
        content: 'This page tests the enhanced content tracking functionality.',
        sections: []
      },
      services: {
        title: 'Our Enhanced Services',
        description: 'Testing service content generation with tracking',
        services: [
          {
            name: 'Web Development',
            description: 'Enhanced web development with tracking'
          }
        ]
      },
      contact: {
        title: 'Contact Enhanced Team',
        content: 'Get in touch with our enhanced team',
        contact_info: {}
      }
    },
    themeConfig: {
      id: 'ananke',
      name: 'Ananke',
      hugoTheme: 'ananke'
    },
    seoData: {
      homepage: {
        title: 'Enhanced Test Website',
        meta_description: 'Testing enhanced features'
      }
    },
    structure: {
      pages: ['homepage', 'about', 'services', 'contact']
    }
  };
  
  try {
    console.log('🚀 Starting enhanced website generation...');
    const result = await builder.buildWebsite(testRequest);
    
    console.log('\n📊 Generation Results:');
    console.log('Success:', result.success);
    console.log('Built Site URL:', result.siteUrl);
    console.log('Source Code URL:', result.sourceUrl);
    console.log('Build Time:', result.buildTime, 'ms');
    console.log('Errors:', result.errors.length);
    
    if (result.metadata) {
      console.log('\n📋 Metadata:');
      console.log('- Theme:', result.metadata.theme);
      console.log('- Content Files:', result.metadata.contentFiles);
      console.log('- Built Package Size:', result.metadata.packageSize, 'bytes');
      console.log('- Source Package Size:', result.metadata.sourceSize, 'bytes');
      console.log('- Hugo Version:', result.metadata.hugoVersion);
      
      if (result.metadata.contentTracking && result.metadata.contentTracking.length > 0) {
        console.log('\n📝 Content Tracking Results:');
        result.metadata.contentTracking.forEach((track, index) => {
          const status = track.success ? '✅' : '❌';
          console.log(`${index + 1}. ${status} ${track.contentType}`);
          console.log(`   File: ${track.filePath || 'N/A'}`);
          console.log(`   Size: ${track.size} bytes`);
          if (track.error) {
            console.log(`   Error: ${track.error}`);
          }
        });
      }
    }
    
    console.log('\n📜 Build Log (last 10 entries):');
    result.buildLog.slice(-10).forEach((log, index) => {
      console.log(`${index + 1}. ${log}`);
    });
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    console.log('\n✅ Enhanced features test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testEnhancedFeatures()
  .then(() => {
    console.log('\n🎉 All tests completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
