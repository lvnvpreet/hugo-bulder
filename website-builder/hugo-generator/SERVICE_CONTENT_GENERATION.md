# Hugo Service Directory Content Generation Guide

## 🎯 **Dynamic Service Content Generation**

Your Hugo website builder creates service content **dynamically** based on user requirements from the frontend wizard, not fixed pages. Here's how it works:

## 📋 **How Service Content is Generated**

### 1. **Conditional Generation**
Service content is only generated when BOTH conditions are met:
```typescript
if (generatedContent.services && wizardData.selectedServices) {
  // Generate dynamic service content
}
```

- **`generatedContent.services`**: AI-generated content for services
- **`wizardData.selectedServices`**: Services selected by user in wizard

### 2. **Dynamic Page Structure**

The system creates content based on user selections:

#### **Services Index Page** (`/content/services/_index.md`)
- ✅ **Always Created** when services are selected
- Lists all selected services with summaries
- Adapts content based on site structure type

#### **Individual Service Pages** (`/content/services/{service-slug}.md`)
- ✅ **Created for Multi-page Sites** only (`structure.type === 'multi-page'`)
- One page per selected service (up to configurable limit)
- Each service gets detailed individual page

### 3. **Content Generation Logic**

```typescript
// Enhanced dynamic generation with limits
const maxServicePages = structure.maxServicePages || 10; // Configurable limit
const shouldCreateIndividualPages = structure.type === 'multi-page' && 
                                   selectedServices.length <= maxServicePages;

// Always create services index
const servicesIndexPath = await this.generateServicesIndex(/*...*/);

// Create individual pages if conditions met
if (shouldCreateIndividualPages) {
  for (let i = 0; i < Math.min(servicesContent.length, selectedServices.length); i++) {
    // Create individual service page
  }
}
```

## 🔄 **Dynamic Content Scenarios**

### **Scenario 1: Single-Page Site**
```json
{
  "structure": { "type": "single-page" },
  "selectedServices": ["web-development", "seo", "consulting"],
  "generatedContent": { "services": [...] }
}
```
**Result:**
- ✅ Creates: `/content/services/_index.md` (with all services)
- ❌ No individual service pages
- All service details included in index page

### **Scenario 2: Multi-Page Site (≤ 10 services)**
```json
{
  "structure": { "type": "multi-page", "maxServicePages": 10 },
  "selectedServices": ["web-development", "seo", "consulting"],
  "generatedContent": { "services": [...] }
}
```
**Result:**
- ✅ Creates: `/content/services/_index.md` (services overview)
- ✅ Creates: `/content/services/web-development.md`
- ✅ Creates: `/content/services/seo.md`
- ✅ Creates: `/content/services/consulting.md`

### **Scenario 3: Multi-Page Site (> 10 services)**
```json
{
  "structure": { "type": "multi-page" },
  "selectedServices": ["service1", "service2", ..., "service15"],
  "generatedContent": { "services": [...] }
}
```
**Result:**
- ✅ Creates: `/content/services/_index.md` (all services listed)
- ❌ No individual service pages (exceeds limit)
- Fallback to single-page behavior

### **Scenario 4: Mismatched Content**
```json
{
  "selectedServices": ["web-dev", "seo", "consulting", "marketing", "design"],
  "generatedContent": { "services": [/* only 3 services */] }
}
```
**Result:**
- ✅ Creates content for first 3 services with AI-generated content
- ✅ Creates basic content for remaining 2 services
- Uses fallback descriptions for missing AI content

## 📄 **Generated Content Structure**

### **Services Index Page Front Matter**
```yaml
---
title: "Our Services"
description: "Comprehensive services to meet your needs"
type: "services"
layout: "services"
draft: false
services_count: 5
has_individual_pages: true
---
```

### **Individual Service Page Front Matter**
```yaml
---
title: "Web Development"
description: "Professional web development services"
type: "service"
layout: "single"
draft: false
service:
  name: "Web Development"
  category: "Development"
  pricing: "$1000+"
---
```

## 🎨 **Content Adaptation**

### **Single-Page Sites**
```markdown
## Web Development

Professional web development services...

### Key Benefits:
- Responsive design
- SEO optimized
- Fast loading

### How It Works:
1. Consultation
2. Design
3. Development
4. Launch

**Starting at:** $1000

---
```

### **Multi-Page Sites (Index)**
```markdown
## Web Development

Professional web development services...

### Key Benefits:
- Responsive design
- SEO optimized

**Starting at:** $1000

[Learn More About Web Development](/services/web-development/)

---
```

## 🔧 **Configuration Options**

### **Structure Configuration**
```typescript
structure: {
  type: 'single-page' | 'multi-page',
  maxServicePages: 10,  // Maximum individual service pages
  serviceLayout: 'grid' | 'list',
  showPricing: true,
  showBenefits: true
}
```

### **Service Data from Wizard**
```typescript
selectedServices: [
  {
    name: "Web Development",
    description: "Custom web development",
    category: "Development",
    pricing: "$1000+",
    features: ["Responsive", "SEO", "Fast"]
  }
]
```

### **AI-Generated Content**
```typescript
generatedContent.services: [
  {
    headline: "Professional Web Development",
    description: "AI-generated service description",
    benefits: ["Benefit 1", "Benefit 2"],
    process: ["Step 1", "Step 2"],
    cta: "Contact us for a quote"
  }
]
```

## 🚀 **Enhanced Features**

### **Content Tracking**
```typescript
// Each service page creation is tracked
contentTracking: [
  {
    filePath: "/content/services/_index.md",
    contentType: "services_index",
    size: 2048,
    success: true
  },
  {
    filePath: "/content/services/web-development.md",
    contentType: "service_page",
    size: 1024,
    success: true
  }
]
```

### **Error Handling**
- ✅ Continues if individual service page fails
- ✅ Creates fallback content for missing AI data
- ✅ Handles mismatched service counts gracefully
- ✅ Provides detailed error logging

### **Flexibility**
- ✅ Configurable page limits
- ✅ Adapts to site structure
- ✅ Handles any number of services
- ✅ Falls back gracefully on errors

## 🎯 **Summary**

Your Hugo service content generation is **fully dynamic** and creates pages based on:

1. **User Selections**: Services chosen in wizard
2. **Site Structure**: Single-page vs multi-page
3. **AI Content**: Generated service descriptions
4. **Configuration**: Limits and preferences

**No fixed page limits** - it adapts to user requirements while maintaining performance and usability through configurable limits.
