import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set up Prisma client
const prisma = new PrismaClient();

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const TEST_USER_ID = 'cmc08g7xh0000uvypi0qe4p07'; // The user ID we fixed previously
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtYzA4ZzcwdWQweHZqcSIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsIm5hbWUiOiJUZXN0IFVzZXIiLCJwbGFuIjoiZnJlZSIsImlhdCI6MTY5MzQwMDAwMH0.i9R8l3CDfEQdfB-eRSUf0Ck67iYNaForEm_4Esj87Ug'; // Replace with a valid token

// HTTP client with authorization
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`
  }
});

// Complete wizard data for website generation testing
const completeWizardData = {
  websiteType: {
    type: 'business',
    category: 'technology',
    detail: 'software development'
  },
  businessInfo: {
    businessName: 'Acme Software Solutions',
    industry: 'Technology',
    yearsInBusiness: 5,
    size: '10-50 employees'
  },
  websitePurpose: {
    primary: 'generate-leads',
    secondary: ['showcase-products', 'provide-information']
  },
  businessDescription: {
    shortDescription: 'Leading software development company specializing in custom solutions',
    fullDescription: 'Acme Software Solutions helps businesses transform their digital presence through cutting-edge software development, cloud solutions, and AI integration.',
    keyValues: ['Innovation', 'Quality', 'Customer Focus']
  },
  servicesSelection: {
    primaryServices: ['Web Development', 'Mobile App Development', 'Cloud Solutions'],
    serviceDetails: [
      {
        name: 'Web Development',
        description: 'Custom web applications built for performance and scalability'
      },
      {
        name: 'Mobile App Development',
        description: 'Native and cross-platform mobile applications for iOS and Android'
      },
      {
        name: 'Cloud Solutions',
        description: 'AWS, Azure and Google Cloud infrastructure and management'
      }
    ]
  },
  locationInfo: {
    address: '123 Tech Park Drive',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94105',
    country: 'USA',
    contactPhone: '415-555-1234',
    contactEmail: 'info@acmesoftware.example',
    timezone: 'America/Los_Angeles'
  },
  websiteStructure: {
    pages: ['home', 'about', 'services', 'portfolio', 'testimonials', 'contact'],
    navigation: [
      {
        label: 'Home',
        href: '/',
        order: 1
      },
      {
        label: 'About Us',
        href: '/about',
        order: 2
      },
      {
        label: 'Services',
        href: '/services',
        order: 3
      },
      {
        label: 'Our Work',
        href: '/portfolio',
        order: 4
      },
      {
        label: 'Testimonials',
        href: '/testimonials',
        order: 5
      },
      {
        label: 'Contact',
        href: '/contact',
        order: 6
      }
    ],
    sections: [
      'hero',
      'services',
      'features',
      'testimonials',
      'portfolio',
      'call-to-action',
      'contact-form'
    ]
  },
  themeConfig: {
    hugoTheme: 'ananke',
    colors: {
      primary: '#4A6FFF',
      secondary: '#34D399',
      accent: '#F59E0B',
      text: '#111827',
      background: '#FFFFFF'
    },
    fonts: {
      heading: 'Montserrat',
      body: 'Inter'
    },
    layout: {
      headerStyle: 'fixed',
      contentWidth: 'wide',
      footerColumns: 3
    }
  }
};

// Test class to run various tests
class TestProjectGeneration {
  private projectId: string | null = null;
  
  async createProject() {
    try {
      console.log('Creating new project with complete wizard data...');
      
      const response = await api.post('/projects', {
        name: 'Test Complete Project ' + new Date().toISOString(),
        description: 'Project created with complete wizard data for testing',
        websiteType: 'business',
        wizardData: completeWizardData
      });
      
      this.projectId = response.data.data.id;
      console.log(`✅ Project created successfully with ID: ${this.projectId}`);
      console.log(`isCompleted: ${response.data.data.isCompleted}`);
      
      return this.projectId;
    } catch (error: any) {
      console.error('❌ Failed to create project:', error.response?.data || error.message);
      throw error;
    }
  }
  
  async checkProjectStatus() {
    try {
      if (!this.projectId) throw new Error('No project ID available');
      
      console.log(`Checking project status for ID: ${this.projectId}`);
      const response = await api.get(`/projects/${this.projectId}`);
      
      console.log(`✅ Project status: isCompleted = ${response.data.data.isCompleted}`);
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Failed to check project status:', error.response?.data || error.message);
      throw error;
    }
  }
  
  async startGeneration() {
    try {
      if (!this.projectId) throw new Error('No project ID available');
      
      console.log(`Starting generation for project ID: ${this.projectId}`);
      const response = await api.post(`/generations/${this.projectId}/start`, {
        hugoTheme: 'ananke',
        customizations: {
          colors: {
            primary: '#4A6FFF',
            secondary: '#34D399'
          },
          fonts: {
            heading: 'Montserrat',
            body: 'Inter'
          }
        },
        contentOptions: {
          tone: 'professional',
          length: 'medium',
          includeSEO: true
        }
      });
      
      console.log(`✅ Generation started successfully!`);
      console.log(`Generation ID: ${response.data.data.generationId}`);
      console.log(`Status: ${response.data.data.status}`);
      
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Failed to start generation:', error.response?.data || error.message);
      throw error;
    }
  }
  
  async checkGenerationStatus(generationId: string) {
    try {
      console.log(`Checking generation status for ID: ${generationId}`);
      const response = await api.get(`/generations/${generationId}`);
      
      console.log(`✅ Generation status: ${response.data.data.status}`);
      console.log(`Current progress: ${response.data.data.progress}%`);
      if (response.data.data.currentStep) {
        console.log(`Current step: ${response.data.data.currentStep}`);
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Failed to check generation status:', error.response?.data || error.message);
      throw error;
    }
  }
  
  async checkUserProjects() {
    try {
      console.log('Checking user projects count and limit...');
      
      // Get user info directly from database
      const user = await prisma.user.findUnique({
        where: { id: TEST_USER_ID },
        select: {
          id: true,
          email: true,
          name: true,
          projectsLimit: true,
          projectsUsed: true,
          _count: {
            select: {
              projects: true
            }
          }
        }
      });
      
      if (!user) {
        console.log('❌ User not found');
        return null;
      }
      
      console.log('User project info:', {
        email: user.email,
        name: user.name,
        projectsLimit: user.projectsLimit,
        projectsUsed: user.projectsUsed,
        actualProjectCount: user._count.projects
      });
      
      return user;
    } catch (error) {
      console.error('❌ Failed to check user projects:', error);
      throw error;
    }
  }
  
  async runFullTest() {
    try {
      console.log('Starting full test for Project Creation and Generation...');
      console.log('=====================================================');
      
      // Check user project count and limits first
      await this.checkUserProjects();
      
      // Create a new project with complete wizard data
      await this.createProject();
      
      // Check if project was marked as completed
      const project = await this.checkProjectStatus();
      if (!project.isCompleted) {
        console.error('❌ Project was not marked as completed!');
        return;
      }
      
      // Start generation for the project
      const generation = await this.startGeneration();
      
      // Check generation status
      if (generation && generation.generationId) {
        await this.checkGenerationStatus(generation.generationId);
      }
      
      console.log('=====================================================');
      console.log('✅ Full test completed successfully!');
      console.log('You can now create projects with wizard data and immediately start generation.');
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Run the test
const tester = new TestProjectGeneration();
tester.runFullTest();
