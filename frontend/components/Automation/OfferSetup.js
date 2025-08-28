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
    leadMagnetFormat: offerData?.offer?.leadMagnetFormat || 'pdf'
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
        type: formData.landingPageType
      }
    };
    
    onComplete(offerSetup);
  };

  const isFormValid = formData.offerName && formData.offerDescription && formData.valueProposition && formData.landingPageUrl;

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">
        Setup Your Offer
      </h2>
      <p className="text-slate-300 mb-8">
        Tell me about what you're promoting so I can create compelling ad creatives that convert.
      </p>
      
      <div className="space-y-6">
        {/* Offer Name */}
        <div>
          <label className="block text-white font-medium mb-2">
            Offer Name *
          </label>
          <input
            type="text"
            value={formData.offerName}
            onChange={(e) => handleInputChange('offerName', e.target.value)}
            placeholder="e.g., Free Marketing Strategy Guide"
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
          />
        </div>
        
        {/* Offer Type */}
        <div>
          <label className="block text-white font-medium mb-2">
            Offer Type *
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'lead_magnet', name: 'Lead Magnet', icon: '📄' },
              { id: 'consultation', name: 'Consultation', icon: '📞' },
              { id: 'webinar', name: 'Webinar', icon: '🎥' }
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => handleInputChange('offerType', type.id)}
                className={`
                  p-4 rounded-lg border text-center transition-all
                  ${formData.offerType === type.id
                    ? 'border-purple-600 bg-purple-900/20 text-purple-300'
                    : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
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
            <label className="block text-white font-medium mb-2">
              Lead Magnet Format
            </label>
            <select
              value={formData.leadMagnetFormat}
              onChange={(e) => handleInputChange('leadMagnetFormat', e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
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
          <label className="block text-white font-medium mb-2">
            Offer Description *
          </label>
          <textarea
            value={formData.offerDescription}
            onChange={(e) => handleInputChange('offerDescription', e.target.value)}
            placeholder="Describe what you're offering in detail. This helps me create accurate ad copy."
            rows={4}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
          />
        </div>
        
        {/* Value Proposition */}
        <div>
          <label className="block text-white font-medium mb-2">
            Key Value Proposition *
          </label>
          <input
            type="text"
            value={formData.valueProposition}
            onChange={(e) => handleInputChange('valueProposition', e.target.value)}
            placeholder="e.g., Get 10x more leads in 30 days or less"
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
          />
        </div>
        
        {/* Call to Action */}
        <div>
          <label className="block text-white font-medium mb-2">
            Primary Call to Action
          </label>
          <input
            type="text"
            value={formData.callToAction}
            onChange={(e) => handleInputChange('callToAction', e.target.value)}
            placeholder="e.g., Download Free Guide, Book Free Call, Register Now"
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
          />
        </div>
        
        {/* Landing Page Setup */}
        <div>
          <label className="block text-white font-medium mb-2">
            Landing Page URL *
          </label>
          <input
            type="url"
            value={formData.landingPageUrl}
            onChange={(e) => handleInputChange('landingPageUrl', e.target.value)}
            placeholder="https://yoursite.com/landing-page"
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
          />
          <p className="text-slate-400 text-sm mt-1">
            Where should I send traffic from your ads?
          </p>
        </div>
        
        {/* Complete Button */}
        <div className="pt-4">
          <button
            onClick={handleComplete}
            disabled={!isFormValid}
            className={`
              w-full py-4 rounded-lg font-medium transition-all
              ${isFormValid
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
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