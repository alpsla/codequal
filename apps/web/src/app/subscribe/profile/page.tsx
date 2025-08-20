'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthenticatedLayout from '../../../components/authenticated-layout';
import { fetchWithAuth } from '../../../utils/api';

interface ProfileData {
  email?: string;
  name?: string;
  company?: string;
  role?: string;
  phoneNumber?: string;
  teamSize?: string;
  currentPlan?: string;
}

export default function SubscribeProfilePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [profileData, setProfileData] = useState<ProfileData>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalSteps = 3;
  const progressPercentage = (currentStep / totalSteps) * 100;

  useEffect(() => {
    // Load existing profile data if available
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetchWithAuth('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (step === 1) {
      if (!profileData.name) newErrors.name = 'Name is required';
      if (!profileData.email) newErrors.email = 'Email is required';
    }
    
    if (step === 2) {
      if (!profileData.company) newErrors.company = 'Company name is required';
      if (!profileData.role) newErrors.role = 'Role is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/user/profile', {
        method: 'POST',
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        // Redirect to subscription selection
        router.push('/subscribe');
      } else {
        alert('Failed to save profile. Please try again.');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gray-50 relative">
        {/* Fixed Progress Bar at Top */}
        <div className="fixed top-16 left-0 right-0 bg-white shadow-sm z-30">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-sm text-gray-500">
                {progressPercentage.toFixed(0)}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Main Content - Add padding to account for fixed progress bar */}
        <div className="pt-32 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white shadow rounded-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Complete Your Profile
              </h2>

              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={profileData.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="John Doe"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={profileData.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="john@example.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profileData.phoneNumber || ''}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Company Information */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Company Information</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={profileData.company || ''}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.company ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Acme Corp"
                    />
                    {errors.company && (
                      <p className="mt-1 text-sm text-red-600">{errors.company}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Your Role *
                    </label>
                    <select
                      value={profileData.role || ''}
                      onChange={(e) => handleInputChange('role', e.target.value)}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.role ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select a role</option>
                      <option value="developer">Developer</option>
                      <option value="lead">Tech Lead</option>
                      <option value="manager">Engineering Manager</option>
                      <option value="architect">Software Architect</option>
                      <option value="cto">CTO</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.role && (
                      <p className="mt-1 text-sm text-red-600">{errors.role}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Team Size
                    </label>
                    <select
                      value={profileData.teamSize || ''}
                      onChange={(e) => handleInputChange('teamSize', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select team size</option>
                      <option value="1">Just me</option>
                      <option value="2-5">2-5 developers</option>
                      <option value="6-10">6-10 developers</option>
                      <option value="11-25">11-25 developers</option>
                      <option value="26-50">26-50 developers</option>
                      <option value="50+">50+ developers</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Step 3: Review and Confirm */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Review Your Information</h3>
                  
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Name:</span>
                      <p className="text-sm text-gray-900">{profileData.name}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Email:</span>
                      <p className="text-sm text-gray-900">{profileData.email}</p>
                    </div>
                    {profileData.phoneNumber && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Phone:</span>
                        <p className="text-sm text-gray-900">{profileData.phoneNumber}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-500">Company:</span>
                      <p className="text-sm text-gray-900">{profileData.company}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Role:</span>
                      <p className="text-sm text-gray-900">{profileData.role}</p>
                    </div>
                    {profileData.teamSize && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Team Size:</span>
                        <p className="text-sm text-gray-900">{profileData.teamSize}</p>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    Please review your information before proceeding. You can go back to make changes if needed.
                  </p>
                </div>
              )}

              {/* Fixed Navigation Buttons at Bottom */}
              <div className="mt-8 flex justify-between items-center border-t pt-6">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className={`px-6 py-2 border rounded-md text-sm font-medium ${
                    currentStep === 1
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                >
                  Previous
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push('/subscribe')}
                    className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Skip for Now
                  </button>
                  
                  {currentStep < totalSteps ? (
                    <button
                      onClick={handleNext}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Complete Profile'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}