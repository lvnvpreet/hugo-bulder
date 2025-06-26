import React from 'react';
import { motion } from 'framer-motion';
import { useWizardStore } from '../../../store/wizardStore';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Checkbox } from '../../ui/checkbox';
import { 
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Star,
  DollarSign,
  Clock,
  Award,
  Zap,
  Shield,
  Heart,
  Briefcase,
  Stethoscope,
  Brain,
  Building2,
  Users,
  Calendar,
  Activity,
  Eye,
  Syringe,
  Microscope
} from 'lucide-react';
import { cn } from '../../../utils';

interface Service {
  id: string;
  name: string;
  description: string;
  price?: string;
  duration?: string;
  featured?: boolean;
  category?: string;
  insuranceAccepted?: boolean;
  appointmentType?: 'in-person' | 'telehealth' | 'both';
}

const Step6ServicesSelection: React.FC = () => {
  const { data, updateData } = useWizardStore();
  const [selectedServices, setSelectedServices] = React.useState<Service[]>(data.servicesSelection?.selectedServices || []);
  const [customServices, setCustomServices] = React.useState<Service[]>(data.servicesSelection?.customServices || []);
  const [showAddService, setShowAddService] = React.useState(false);
  const [editingService, setEditingService] = React.useState<Service | null>(null);

  const [newService, setNewService] = React.useState<Partial<Service>>({
    name: '',
    description: '',
    price: '',
    duration: '',
    featured: false,
    category: 'Custom',
    insuranceAccepted: false,
    appointmentType: 'in-person'
  });

  // Healthcare-specific logic
  const isHealthcareCategory = data.businessCategory?.id === 'healthcare';
  const selectedSubcategory = data.businessInfo?.selectedSubcategory;
  const businessType = isHealthcareCategory ? 'healthcare' : (data.businessCategory?.id || data.websiteType?.id || 'business');

  const handleSave = () => {
    const servicesData = {
      selectedServices,
      customServices,
      totalServices: selectedServices.length + customServices.length
    };
    
    updateData('servicesSelection', servicesData);
  };

  React.useEffect(() => {
    handleSave();
  }, [selectedServices, customServices]);

  const getHealthcareServicesBySubcategory = () => {
    if (!selectedSubcategory) return [];

    switch (selectedSubcategory.id) {
      case 'doctors':
        return [
          {
            id: 'general-exam',
            name: 'General Medical Exam',
            description: 'Comprehensive physical examination and health assessment',
            category: 'Primary Care',
            icon: Stethoscope,
            duration: '30-45 minutes',
            price: 'Insurance accepted'
          },
          {
            id: 'immunizations',
            name: 'Immunizations & Vaccines',
            description: 'Preventive vaccines and immunizations for all ages',
            category: 'Preventive Care',
            icon: Syringe,
            duration: '15-20 minutes',
            price: 'Most insurance covered'
          },
          {
            id: 'lab-services',
            name: 'Laboratory Services',
            description: 'Blood work, urine tests, and diagnostic laboratory services',
            category: 'Diagnostic',
            icon: Microscope,
            duration: '10-15 minutes',
            price: 'Varies by test'
          },
          {
            id: 'chronic-disease',
            name: 'Chronic Disease Management',
            description: 'Ongoing care for diabetes, hypertension, and chronic conditions',
            category: 'Chronic Care',
            icon: Heart,
            duration: '45-60 minutes',
            price: 'Insurance accepted'
          },
          {
            id: 'specialist-referrals',
            name: 'Specialist Referrals',
            description: 'Coordination of care with medical specialists',
            category: 'Care Coordination',
            icon: Users,
            duration: '20-30 minutes',
            price: 'Consultation fee'
          },
          {
            id: 'telehealth',
            name: 'Telehealth Consultations',
            description: 'Virtual medical consultations and follow-up visits',
            category: 'Virtual Care',
            icon: Calendar,
            duration: '15-30 minutes',
            price: 'Same as office visit'
          }
        ];
      
      case 'dentists':
        return [
          {
            id: 'dental-cleaning',
            name: 'Dental Cleaning & Checkups',
            description: 'Professional teeth cleaning and oral health examination',
            category: 'Preventive Care',
            icon: Stethoscope,
            duration: '45-60 minutes',
            price: 'Insurance typically covers'
          },
          {
            id: 'fillings',
            name: 'Fillings & Restorations',
            description: 'Treatment for cavities and tooth restoration',
            category: 'Restorative',
            icon: Award,
            duration: '30-90 minutes',
            price: 'Varies by material'
          },
          {
            id: 'cosmetic-dentistry',
            name: 'Cosmetic Dentistry',
            description: 'Teeth whitening, veneers, and smile enhancement',
            category: 'Cosmetic',
            icon: Star,
            duration: '1-3 hours',
            price: 'Cash/financing available'
          },
          {
            id: 'orthodontics',
            name: 'Orthodontics',
            description: 'Braces, aligners, and teeth straightening treatments',
            category: 'Orthodontic',
            icon: Activity,
            duration: 'Ongoing treatment',
            price: 'Payment plans available'
          },
          {
            id: 'oral-surgery',
            name: 'Oral Surgery',
            description: 'Tooth extractions, implants, and surgical procedures',
            category: 'Surgical',
            icon: Zap,
            duration: '1-2 hours',
            price: 'Insurance may cover'
          },
          {
            id: 'pediatric-dentistry',
            name: 'Pediatric Dentistry',
            description: 'Specialized dental care for children and adolescents',
            category: 'Pediatric',
            icon: Heart,
            duration: '30-45 minutes',
            price: 'Insurance accepted'
          }
        ];

      case 'therapists':
        return [
          {
            id: 'individual-therapy',
            name: 'Individual Therapy',
            description: 'One-on-one counseling sessions for personal growth and healing',
            category: 'Individual',
            icon: Brain,
            duration: '50 minutes',
            price: 'Sliding scale available'
          },
          {
            id: 'couples-therapy',
            name: 'Couples Therapy',
            description: 'Relationship counseling for couples and partners',
            category: 'Relationship',
            icon: Heart,
            duration: '50-80 minutes',
            price: 'Insurance may cover'
          },
          {
            id: 'family-therapy',
            name: 'Family Therapy',
            description: 'Family counseling and conflict resolution',
            category: 'Family',
            icon: Users,
            duration: '60-90 minutes',
            price: 'Family rates available'
          },
          {
            id: 'group-therapy',
            name: 'Group Therapy',
            description: 'Therapeutic group sessions for shared experiences',
            category: 'Group',
            icon: Users,
            duration: '60-90 minutes',
            price: 'Reduced group rates'
          },
          {
            id: 'cbt',
            name: 'Cognitive Behavioral Therapy',
            description: 'Evidence-based approach for anxiety, depression, and behavioral issues',
            category: 'Specialized',
            icon: Brain,
            duration: '50 minutes',
            price: 'Insurance accepted'
          },
          {
            id: 'trauma-therapy',
            name: 'Trauma Therapy',
            description: 'Specialized treatment for PTSD and trauma recovery',
            category: 'Specialized',
            icon: Shield,
            duration: '50-90 minutes',
            price: 'Most insurance covers'
          }
        ];

      case 'clinics':
        return [
          {
            id: 'multi-specialty',
            name: 'Multi-Specialty Care',
            description: 'Comprehensive medical services with multiple specialists',
            category: 'Comprehensive',
            icon: Building2,
            duration: 'Varies by service',
            price: 'Insurance accepted'
          },
          {
            id: 'diagnostic-services',
            name: 'Diagnostic Services',
            description: 'X-rays, ultrasounds, and diagnostic imaging services',
            category: 'Diagnostic',
            icon: Eye,
            duration: '30-60 minutes',
            price: 'Insurance typically covers'
          },
          {
            id: 'pharmacy',
            name: 'Pharmacy Services',
            description: 'On-site pharmacy for prescription medications',
            category: 'Pharmacy',
            icon: Activity,
            duration: '5-15 minutes',
            price: 'Prescription copay'
          },
          {
            id: 'urgent-care',
            name: 'Urgent Care',
            description: 'Walk-in care for non-emergency medical needs',
            category: 'Urgent Care',
            icon: Zap,
            duration: '30-60 minutes',
            price: 'Insurance/cash rates'
          },
          {
            id: 'health-screenings',
            name: 'Health Screenings',
            description: 'Preventive health screenings and wellness exams',
            category: 'Preventive',
            icon: Microscope,
            duration: '20-45 minutes',
            price: 'Often covered 100%'
          },
          {
            id: 'occupational-health',
            name: 'Occupational Health',
            description: 'Workplace health services and employee wellness programs',
            category: 'Occupational',
            icon: Briefcase,
            duration: 'Varies by service',
            price: 'Employer/insurance'
          }
        ];

      default:
        return [];
    }
  };

  const predefinedServices = {
    business: [
      {
        id: 'consulting',
        name: 'Business Consulting',
        description: 'Strategic business advice and planning',
        category: 'Consulting',
        icon: Briefcase
      },
      {
        id: 'marketing',
        name: 'Marketing Services',
        description: 'Digital marketing and brand promotion',
        category: 'Marketing',
        icon: Zap
      },
      {
        id: 'support',
        name: 'Customer Support',
        description: '24/7 customer service and assistance',
        category: 'Support',
        icon: Shield
      }
    ],
    healthcare: getHealthcareServicesBySubcategory(),
    technology: [
      {
        id: 'development',
        name: 'Software Development',
        description: 'Custom software solutions',
        category: 'Development',
        icon: Briefcase
      },
      {
        id: 'maintenance',
        name: 'System Maintenance',
        description: 'Ongoing technical support',
        category: 'Support',
        icon: Shield
      },
      {
        id: 'consulting',
        name: 'IT Consulting',
        description: 'Technology strategy and planning',
        category: 'Consulting',
        icon: Award
      }
    ],
    creative: [
      {
        id: 'design',
        name: 'Graphic Design',
        description: 'Visual design and branding',
        category: 'Design',
        icon: Heart
      },
      {
        id: 'photography',
        name: 'Photography',
        description: 'Professional photo services',
        category: 'Media',
        icon: Star
      },
      {
        id: 'video',
        name: 'Video Production',
        description: 'Video creation and editing',
        category: 'Media',
        icon: Zap
      }
    ]
  };

  const getServicesForBusinessType = (): Array<Service & { icon: any }> => {
    const services = predefinedServices[businessType as keyof typeof predefinedServices] || predefinedServices.business;
    return services;
  };

  const toggleService = (service: Service & { icon: any }) => {
    const serviceData: Service = {
      id: service.id,
      name: service.name,
      description: service.description,
      category: service.category
    };

    const isSelected = selectedServices.some(s => s.id === service.id);
    
    if (isSelected) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, serviceData]);
    }
  };

  const addCustomService = () => {
    if (!newService.name || !newService.description) return;

    const service: Service = {
      id: `custom-${Date.now()}`,
      name: newService.name,
      description: newService.description,
      price: newService.price,
      duration: newService.duration,
      featured: newService.featured,
      category: newService.category || 'Custom'
    };

    setCustomServices([...customServices, service]);
    setNewService({
      name: '',
      description: '',
      price: '',
      duration: '',
      featured: false,
      category: 'Custom'
    });
    setShowAddService(false);
  };

  const updateCustomService = () => {
    if (!editingService || !newService.name || !newService.description) return;

    const updatedService: Service = {
      ...editingService,
      name: newService.name,
      description: newService.description,
      price: newService.price,
      duration: newService.duration,
      featured: newService.featured,
      category: newService.category || 'Custom'
    };

    setCustomServices(customServices.map(s => s.id === editingService.id ? updatedService : s));
    setEditingService(null);
    setNewService({
      name: '',
      description: '',
      price: '',
      duration: '',
      featured: false,
      category: 'Custom'
    });
  };

  const deleteCustomService = (serviceId: string) => {
    setCustomServices(customServices.filter(s => s.id !== serviceId));
  };

  const startEditingService = (service: Service) => {
    setEditingService(service);
    setNewService({
      name: service.name,
      description: service.description,
      price: service.price,
      duration: service.duration,
      featured: service.featured,
      category: service.category
    });
  };

  const cancelEditing = () => {
    setEditingService(null);
    setShowAddService(false);
    setNewService({
      name: '',
      description: '',
      price: '',
      duration: '',
      featured: false,
      category: 'Custom'
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {isHealthcareCategory ? "What services does your practice offer?" : "What services do you offer?"}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {isHealthcareCategory 
            ? "Select from medical services for your specialty or add your own. This will help create relevant service pages and appointment booking options."
            : "Select from popular services for your industry or add your own custom services. This will help create relevant pages and content for your website."
          }
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Predefined Services */}
          <Card className="p-6 bg-white dark:bg-gray-800">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isHealthcareCategory 
                    ? `Popular Services for ${selectedSubcategory?.name || 'Healthcare Practices'}`
                    : "Popular Services for Your Industry"
                  }
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getServicesForBusinessType().map((service) => {
                  const IconComponent = service.icon;
                  const isSelected = selectedServices.some(s => s.id === service.id);
                  
                  return (
                    <motion.div
                      key={service.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card
                        className={cn(
                          "p-4 cursor-pointer transition-all duration-200",
                          isSelected 
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400" 
                            : "border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500"
                        )}
                        onClick={() => toggleService(service)}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center",
                                isSelected ? "bg-blue-100 dark:bg-blue-800" : "bg-gray-100 dark:bg-gray-700"
                              )}>
                                <IconComponent className={cn(
                                  "w-5 h-5",
                                  isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
                                )} />
                              </div>
                              <div>
                                <h4 className={cn(
                                  "font-medium",
                                  isSelected ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-white"
                                )}>
                                  {service.name}
                                </h4>
                                <Badge variant="secondary" className="text-xs">
                                  {service.category}
                                </Badge>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {service.description}
                          </p>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Custom Services */}
          <Card className="p-6 bg-white dark:bg-gray-800">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Plus className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {isHealthcareCategory ? "Additional Services" : "Custom Services"}
                  </h3>
                </div>
                <Button
                  onClick={() => setShowAddService(true)}
                  className="dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </Button>
              </div>

              {/* Add/Edit Service Form */}
              {(showAddService || editingService) && (
                <Card className="p-4 bg-gray-50 dark:bg-gray-700 border-dashed">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {editingService ? 'Edit Service' : 'Add New Service'}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="serviceName" className="text-gray-700 dark:text-gray-300">
                          Service Name *
                        </Label>
                        <Input
                          id="serviceName"
                          placeholder={isHealthcareCategory 
                            ? "e.g., Pediatric Consultation, Root Canal..."
                            : "e.g., Web Design, Consultation..."
                          }
                          value={newService.name}
                          onChange={(e) => setNewService({...newService, name: e.target.value})}
                          className="dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="serviceCategory" className="text-gray-700 dark:text-gray-300">
                          Category
                        </Label>
                        <Input
                          id="serviceCategory"
                          placeholder={isHealthcareCategory 
                            ? "e.g., Primary Care, Specialty, Diagnostic..."
                            : "e.g., Design, Consulting..."
                          }
                          value={newService.category}
                          onChange={(e) => setNewService({...newService, category: e.target.value})}
                          className="dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="serviceDescription" className="text-gray-700 dark:text-gray-300">
                        Description *
                      </Label>
                      <Input
                        id="serviceDescription"
                        placeholder={isHealthcareCategory 
                          ? "Describe the medical service and what it includes..."
                          : "Describe what this service includes..."
                        }
                        value={newService.description}
                        onChange={(e) => setNewService({...newService, description: e.target.value})}
                        className="dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="servicePrice" className="text-gray-700 dark:text-gray-300">
                          Price (Optional)
                        </Label>
                        <Input
                          id="servicePrice"
                          placeholder={isHealthcareCategory 
                            ? "e.g., Insurance accepted, $150 cash rate..."
                            : "e.g., $99, Starting at $500..."
                          }
                          value={newService.price}
                          onChange={(e) => setNewService({...newService, price: e.target.value})}
                          className="dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="serviceDuration" className="text-gray-700 dark:text-gray-300">
                          Duration (Optional)
                        </Label>
                        <Input
                          id="serviceDuration"
                          placeholder={isHealthcareCategory 
                            ? "e.g., 30 minutes, 1-2 hours, Same day..."
                            : "e.g., 2-3 weeks, 1 hour..."
                          }
                          value={newService.duration}
                          onChange={(e) => setNewService({...newService, duration: e.target.value})}
                          className="dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="featured"
                        checked={newService.featured}
                        onCheckedChange={(checked) => setNewService({...newService, featured: checked as boolean})}
                      />
                      <Label htmlFor="featured" className="text-gray-700 dark:text-gray-300">
                        Feature this service on homepage
                      </Label>
                    </div>

                    <div className="flex space-x-3">
                      <Button
                        onClick={editingService ? updateCustomService : addCustomService}
                        disabled={!newService.name || !newService.description}
                        className="dark:bg-green-600 dark:hover:bg-green-700"
                      >
                        {editingService ? 'Update Service' : 'Add Service'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={cancelEditing}
                        className="dark:border-gray-500 dark:text-gray-300"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Custom Services List */}
              <div className="space-y-3">
                {customServices.map((service) => (
                  <Card key={service.id} className="p-4 dark:bg-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {service.name}
                          </h4>
                          {service.featured && (
                            <Badge className="bg-yellow-500 text-white">
                              <Star className="w-3 h-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                          <Badge variant="secondary">
                            {service.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {service.description}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                          {service.price && (
                            <div className="flex items-center space-x-1">
                              <DollarSign className="w-3 h-3" />
                              <span>{service.price}</span>
                            </div>
                          )}
                          {service.duration && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{service.duration}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditingService(service)}
                          className="dark:border-gray-500 dark:text-gray-300"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteCustomService(service.id)}
                          className="dark:border-gray-500 dark:text-gray-300 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                
                {customServices.length === 0 && !showAddService && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8 italic">
                    No custom services added yet. Click "Add Service" to create your own.
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <Card className="p-6 bg-white dark:bg-gray-800">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Services Summary
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Selected Services:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedServices.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Custom Services:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {customServices.length}
                  </span>
                </div>
                <hr className="border-gray-200 dark:border-gray-600" />
                <div className="flex justify-between">
                  <span className="font-medium text-gray-900 dark:text-white">Total Services:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {selectedServices.length + customServices.length}
                  </span>
                </div>
              </div>

              {(selectedServices.length > 0 || customServices.length > 0) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Your Services:
                  </h4>
                  <div className="space-y-1">
                    {[...selectedServices, ...customServices].map((service) => (
                      <div key={service.id} className="text-sm text-gray-600 dark:text-gray-400">
                        • {service.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Tips */}
          <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                {isHealthcareCategory ? '🩺 Healthcare Service Tips' : '💡 Service Tips'}
              </h3>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                {isHealthcareCategory ? (
                  <>
                    <li>• Include your core medical services and specializations</li>
                    <li>• Mention insurance acceptance and payment options</li>
                    <li>• Specify appointment types (in-person, telehealth)</li>
                    <li>• Add duration estimates for patient planning</li>
                    <li>• Feature emergency or urgent care services</li>
                    <li>• Include preventive care options</li>
                  </>
                ) : (
                  <>
                    <li>• Start with 3-5 core services</li>
                    <li>• Add pricing for transparency</li>
                    <li>• Use clear, benefit-focused descriptions</li>
                    <li>• Feature your most popular services</li>
                    <li>• You can always add more services later</li>
                  </>
                )}
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Step6ServicesSelection;
