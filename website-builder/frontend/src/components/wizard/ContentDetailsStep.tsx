import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useWizardStore } from '../../store/wizard';
import { contentDetailsSchema, type ContentDetails } from '../../utils/validation';
import { Plus, Trash2 } from 'lucide-react';

interface ContentDetailsStepProps {
  onNext: () => void;
  onPrevious: () => void;
}

export const ContentDetailsStep: React.FC<ContentDetailsStepProps> = ({ 
  onNext, 
  onPrevious 
}) => {
  const { data, updateData } = useWizardStore();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ContentDetails>({
    resolver: zodResolver(contentDetailsSchema),
    defaultValues: data.contentDetails || {
      companyName: '',
      tagline: '',
      aboutUs: '',
      services: [''],
      contactInfo: {
        email: '',
        phone: '',
        address: '',
        socialMedia: {
          facebook: '',
          twitter: '',
          linkedin: '',
          instagram: ''
        }
      }
    }
  });

  const services = watch('services') || [''];

  const addService = () => {
    setValue('services', [...services, '']);
  };

  const removeService = (index: number) => {
    const updated = services.filter((_, i) => i !== index);
    setValue('services', updated.length === 0 ? [''] : updated);
  };

  const updateService = (index: number, value: string) => {
    const updated = [...services];
    updated[index] = value;
    setValue('services', updated);
  };

  const onSubmit = (formData: ContentDetails) => {
    // Filter out empty services
    const cleanedData = {
      ...formData,
      services: formData.services.filter(service => service.trim() !== '')
    };
    updateData({ contentDetails: cleanedData });
    onNext();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Tell Us About Your Business
        </CardTitle>
        <p className="text-muted-foreground text-center">
          Provide content details to personalize your website
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              placeholder="Your Company Name"
              {...register('companyName')}
              className={errors.companyName ? 'border-red-500' : ''}
            />
            {errors.companyName && (
              <p className="text-sm text-red-500">{errors.companyName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              placeholder="Your company's motto or slogan"
              {...register('tagline')}
              className={errors.tagline ? 'border-red-500' : ''}
            />
            {errors.tagline && (
              <p className="text-sm text-red-500">{errors.tagline.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="aboutUs">About Us *</Label>
            <Textarea
              id="aboutUs"
              placeholder="Tell us about your company, mission, and values..."
              className={`min-h-[120px] ${errors.aboutUs ? 'border-red-500' : ''}`}
              {...register('aboutUs')}
            />
            {errors.aboutUs && (
              <p className="text-sm text-red-500">{errors.aboutUs.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Services/Products</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addService}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Service
              </Button>
            </div>
            <div className="space-y-3">
              {services.map((service, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder={`Service ${index + 1}`}
                    value={service}
                    onChange={(e) => updateService(index, e.target.value)}
                    className="flex-1"
                  />
                  {services.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeService(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {errors.services && (
              <p className="text-sm text-red-500">{errors.services.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@company.com"
                  {...register('contactInfo.email')}
                  className={errors.contactInfo?.email ? 'border-red-500' : ''}
                />
                {errors.contactInfo?.email && (
                  <p className="text-sm text-red-500">{errors.contactInfo.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+1 (555) 123-4567"
                  {...register('contactInfo.phone')}
                  className={errors.contactInfo?.phone ? 'border-red-500' : ''}
                />
                {errors.contactInfo?.phone && (
                  <p className="text-sm text-red-500">{errors.contactInfo.phone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                placeholder="123 Main St, City, State 12345"
                {...register('contactInfo.address')}
                className={errors.contactInfo?.address ? 'border-red-500' : ''}
              />
              {errors.contactInfo?.address && (
                <p className="text-sm text-red-500">{errors.contactInfo.address.message}</p>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Social Media (Optional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    placeholder="https://facebook.com/yourpage"
                    {...register('contactInfo.socialMedia.facebook')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter</Label>
                  <Input
                    id="twitter"
                    placeholder="https://twitter.com/youraccount"
                    {...register('contactInfo.socialMedia.twitter')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    placeholder="https://linkedin.com/company/yourcompany"
                    {...register('contactInfo.socialMedia.linkedin')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    placeholder="https://instagram.com/youraccount"
                    {...register('contactInfo.socialMedia.instagram')}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={onPrevious}>
              Previous
            </Button>
            <Button type="submit">
              Next
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
