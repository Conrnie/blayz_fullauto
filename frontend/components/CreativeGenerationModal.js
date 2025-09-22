import React, { useState } from 'react';

const CreativeGenerationModal = ({ isOpen, onClose, onSubmit, companyProfileId, aiAssistantId }) => {
  const [amount, setAmount] = useState(3);
  const [creativeAngle, setCreativeAngle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    console.log('🎯 CreativeGenerationModal handleSubmit called');
    console.log('🎯 Event object:', e);
    e.preventDefault();
    console.log('🎯 Form submission prevented default behavior');
    console.log('🎯 Current form state:', { amount, creativeAngle, description, companyProfileId, aiAssistantId });
    
    if (!creativeAngle.trim()) {
      console.log('❌ Creative angle validation failed');
      alert('Please enter a creative angle');
      return;
    }
    
    console.log('✅ Creative angle validation passed:', creativeAngle);

    setIsSubmitting(true);
    console.log('🔄 Setting isSubmitting to true');
    
    try {
      console.log('🚀 About to call onSubmit with data:', {
        amount: parseInt(amount),
        creativeAngle: creativeAngle.trim(),
        description: description.trim(),
        companyProfileId,
        aiAssistantId
      });
      
      await onSubmit({
        amount: parseInt(amount),
        creativeAngle: creativeAngle.trim(),
        description: description.trim(),
        companyProfileId,
        aiAssistantId
      });
      
      console.log('✅ onSubmit completed successfully');
      
      // Reset form
      setAmount(3);
      setCreativeAngle('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Error submitting creative generation:', error);
      alert('Failed to generate creatives. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setAmount(3);
      setCreativeAngle('');
      setDescription('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Generate Ad Creatives</h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Number of Ads (1-5)
              </label>
              <select
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              >
                <option value={1}>1 Ad</option>
                <option value={2}>2 Ads</option>
                <option value={3}>3 Ads</option>
                <option value={4}>4 Ads</option>
                <option value={5}>5 Ads</option>
              </select>
            </div>

            <div>
              <label htmlFor="creativeAngle" className="block text-sm font-medium text-gray-700 mb-1">
                Creative Angle *
              </label>
              <input
                type="text"
                id="creativeAngle"
                value={creativeAngle}
                onChange={(e) => setCreativeAngle(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g., FOMO, Social Proof, Problem-Solution"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Additional Description (Optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                placeholder="Any specific requirements or details for the ads..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  'Generate Ads'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreativeGenerationModal;