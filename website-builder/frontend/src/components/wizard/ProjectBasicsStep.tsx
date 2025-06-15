import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import  {useWizardStore}  from '../../store/wizard';
import { projectBasicsSchema, type ProjectBasics } from '../../utils/validation';
import { websiteTypes } from '../../types';

interface ProjectBasicsStepProps {
  onNext: () => void;
  onPrevious?: () => void;
}

export const ProjectBasicsStep: React.FC<ProjectBasicsStepProps> = ({ onNext, onPrevious }) => {
  const { data, updateData } = useWizardStore();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ProjectBasics>({
    resolver: zodResolver(projectBasicsSchema),    defaultValues: {
      name: data.name || '',
      description: data.description || '',
      websiteType: (data.websiteType || 'business') as any,
      domain: data.domain || '',
      keywords: data.keywords || ''
    }
  });

  const websiteType = watch('websiteType');
  const onSubmit = (formData: ProjectBasics) => {
    updateData(formData);
    onNext();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Let's Start With The Basics
        </CardTitle>
        <p className="text-muted-foreground text-center">
          Tell us about your website project
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              placeholder="My Awesome Website"
              {...register('name')}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your website project..."
              {...register('description')}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <Label>Website Type *</Label>
            <RadioGroup
              value={websiteType}
              onValueChange={(value) => setValue('websiteType', value as any)}
            >
              {websiteTypes.map((type) => (
                <div key={type.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={type.id} id={type.id} />
                  <Label htmlFor={type.id} className="cursor-pointer">
                    <div>
                      <div className="font-medium">{type.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {type.description}
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {errors.websiteType && (
              <p className="text-sm text-red-500">{errors.websiteType.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Domain (Optional)</Label>
            <Input
              id="domain"
              placeholder="example.com"
              {...register('domain')}
              className={errors.domain ? 'border-red-500' : ''}
            />
            {errors.domain && (
              <p className="text-sm text-red-500">{errors.domain.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords (Optional)</Label>
            <Input
              id="keywords"
              placeholder="business, professional, services..."
              {...register('keywords')}
              className={errors.keywords ? 'border-red-500' : ''}
            />
            <p className="text-sm text-muted-foreground">
              Separate keywords with commas to help generate relevant content
            </p>
            {errors.keywords && (
              <p className="text-sm text-red-500">{errors.keywords.message}</p>
            )}
          </div>

          <div className="flex justify-between pt-4">
            {onPrevious && (
              <Button type="button" variant="outline" onClick={onPrevious}>
                Previous
              </Button>
            )}
            <Button type="submit" className="ml-auto">
              Next
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
