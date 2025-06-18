// Test script to verify ThemeDetectionService is working
import { ThemeDetectionService } from './src/services/ThemeDetectionService.ts';

console.log('Testing ThemeDetectionService...');

const testWizardData = {
  businessInfo: {
    name: 'car chuno',
    description: 'At Car Chuno, we bring precision, passion, and a little bit of grease under the fingernails to the art of automotive repair and performance.',
    industry: 'Professional'
  },
  websiteType: {
    id: 'business',
    category: 'Business Website',
    description: 'Professional website for your business'
  },
  businessCategory: {
    id: 'professional',
    name: 'Professional Services',
    industry: 'Professional'
  }
};

async function testThemeDetection() {
  try {
    console.log('Creating ThemeDetectionService...');
    const service = new ThemeDetectionService();
    
    console.log('Initializing service...');
    await service.initialize();
    
    console.log('Detecting theme...');
    const recommendation = await service.detectTheme(testWizardData);
    
    console.log('Theme recommendation:', recommendation);
    
    console.log('✅ ThemeDetectionService is working!');
  } catch (error) {
    console.error('❌ ThemeDetectionService failed:', error);
  }
}

testThemeDetection();
