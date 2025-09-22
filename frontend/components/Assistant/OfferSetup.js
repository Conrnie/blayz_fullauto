import React, { useState } from 'react';

const OfferSetup = ({ onComplete, offerData }) => {
  const [formData, setFormData] = useState({
    offerName: offerData?.offer?.name || '',
    offerType: offerData?.offer?.type || 'lead_magnet',
    offerDescription: offerData?.offer?.description || '',
    valueProposition: offerData?.offer?.valueProposition || '',
    landingPageUrl: offerData?.landingPage?.url || '',
    landingPageType: offerData?.landingPage?.type || 'external',
    callToAction: offerData?.offer?.callToAction || '',
    leadMagnetFormat: offerData?.offer?.leadMagnetFormat || 'pdf',
    useMetaForms: offerData?.landingPage?.useMetaForms || false,
    useLandingPage: offerData?.landingPage?.useLandingPage || true
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleComplete = () => {
    const offerSetup = {
      offer: {
        name: formData.offerName,
        type: formData.offerType,
        description: formData.offerDescription,
        valueProposition: formData.valueProposition,
        callToAction: formData.callToAction,
        leadMagnetFormat: formData.offerType === 'lead_magnet' ? formData.leadMagnetFormat : null
      },
      landingPage: {
        url: formData.landingPageUrl,
        type: formData.landingPageType,
        useMetaForms: formData.useMetaForms,
        useLandingPage: formData.useLandingPage
      }
    };
    
    onComplete(offerSetup);
  };

  const isFormValid = formData.offerName && formData.offerDescription && formData.valueProposition && 
    (formData.useMetaForms || formData.useLandingPage) && 
    (!formData.useLandingPage || formData.landingPageUrl);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Setup Your Offer
      </h2>
      <p className="text-gray-600 mb-6">
        Tell me about what you're promoting so I can create compelling ad creatives that convert.
      </p>
      
      <div className="space-y-6">
        {/* Offer Name */}
        <div>
          <label className="block text-gray-900 font-medium mb-2">
            Offer Name *
          </label>
          <input
            type="text"
            value={formData.offerName}
            onChange={(e) => handleInputChange('offerName', e.target.value)}
            placeholder="e.g., Free Marketing Strategy Guide"
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none"
          />
        </div>
        
        {/* Offer Type */}
        <div>
          <label className="block text-gray-900 font-medium mb-2">
            Offer Type *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'lead_magnet', name: 'Lead Magnet', icon: '📄' },
              { id: 'consultation', name: 'Consultation', icon: '📞' },
              { id: 'webinar', name: 'Webinar', icon: '🎥' },
              { id: 'other', name: 'Other', icon: '💼' }
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => handleInputChange('offerType', type.id)}
                className={`
                  p-4 rounded-lg border text-center transition-all
                  ${formData.offerType === type.id
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }
                `}
              >
                <div className="text-2xl mb-1">{type.icon}</div>
                <div className="text-sm font-medium">{type.name}</div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Lead Magnet Format (if applicable) */}
        {formData.offerType === 'lead_magnet' && (
          <div>
            <label className="block text-gray-900 font-medium mb-2">
              Lead Magnet Format
            </label>
            <select
              value={formData.leadMagnetFormat}
              onChange={(e) => handleInputChange('leadMagnetFormat', e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:border-orange-500 focus:outline-none"
            >
              <option value="pdf">PDF Guide</option>
              <option value="checklist">Checklist</option>
              <option value="template">Template</option>
              <option value="video">Video Training</option>
              <option value="course">Mini Course</option>
            </select>
          </div>
        )}
        
        {/* Offer Description */}
        <div>
          <label className="block text-gray-900 font-medium mb-2">
            Describe Your Offer *
          </label>
          <textarea
            value={formData.offerDescription}
            onChange={(e) => handleInputChange('offerDescription', e.target.value)}
            placeholder="Describe what you're offering in detail. This helps me create better ad copy."
            rows={4}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none resize-none"
          />
        </div>
        
        {/* Value Proposition */}
        <div>
          <label className="block text-gray-900 font-medium mb-2">
            Key Value Proposition *
          </label>
          <input
            type="text"
            value={formData.valueProposition}
            onChange={(e) => handleInputChange('valueProposition', e.target.value)}
            placeholder="e.g., Get 10x more leads in 30 days or less"
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none"
          />
        </div>
        
        {/* Traffic Destination Setup */}
        <div>
          <label className="block text-gray-900 font-medium mb-3">
            How do you capture leads? *
          </label>
          
          <div className="space-y-3 mb-4">
            {/* Meta Forms Option */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="metaForms"
                checked={formData.useMetaForms}
                onChange={(e) => handleInputChange('useMetaForms', e.target.checked)}
                className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
              />
              <label htmlFor="metaForms" className="ml-2 text-gray-900 font-medium">
                Meta Forms
              </label>
            </div>
            
            {/* Landing Page Option */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="landingPage"
                checked={formData.useLandingPage}
                onChange={(e) => handleInputChange('useLandingPage', e.target.checked)}
                className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
              />
              <label htmlFor="landingPage" className="ml-2 text-gray-900 font-medium">
                Landing Page
              </label>
            </div>
          </div>
          
          {/* Landing Page URL Input - Only show when Landing Page is selected */}
          {formData.useLandingPage && (
            <div>
              <label className="block text-gray-900 font-medium mb-2">
                Landing Page URL *
              </label>
              <input
                type="url"
                value={formData.landingPageUrl}
                onChange={(e) => handleInputChange('landingPageUrl', e.target.value)}
                placeholder="https://yoursite.com/landing-page"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none"
              />
            </div>
          )}
        </div>
        
        {/* Complete Button */}
        <div className="pt-4">
          <button
            onClick={handleComplete}
            disabled={!isFormValid}
            className={`
              w-full py-4 rounded-lg font-medium transition-all
              ${isFormValid
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            Complete Offer Setup
          </button>
        </div>
      </div>
      
      {!isFormValid && (
        <div className="mt-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
          <p className="text-slate-300 text-sm">
            💡 Fill in all required fields (*) to continue. This information helps me create targeted ads that convert.
          </p>
        </div>
      )}
    </div>
  );
};

export default OfferSetup;