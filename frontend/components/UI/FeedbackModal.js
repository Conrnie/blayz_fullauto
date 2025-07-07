import React, { useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import Button from './Button';

/**
 * Feedback Modal component for submitting bug reports and feature requests
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Function to close the modal
 * @returns {JSX.Element}
 */
const FeedbackModal = ({ isOpen, onClose }) => {
  const [type, setType] = useState('bug');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState({ success: false, message: '' });
  const [showResult, setShowResult] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setShowResult(false);

    try {
      // Get the shared Supabase client
      const supabase = getSupabaseBrowserClient();
      
      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('submit-feedback', {
        body: { type, description, email },
      });

      if (error) {
        throw new Error(error.message || 'Failed to submit feedback');
      }

      // Success!
      setSubmitResult({
        success: true,
        message: 'Thank you for your feedback! We will review it shortly.',
      });
      setShowResult(true);
      
      // Reset form
      setType('bug');
      setDescription('');
      setEmail('');
      
      // Auto-close after successful submission (optional)
      setTimeout(() => {
        onClose();
        setShowResult(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitResult({
        success: false,
        message: error.message || 'Something went wrong. Please try again.',
      });
      setShowResult(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop/overlay */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
        aria-hidden="true"
      ></div>
      
      {/* Modal content */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 z-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Provide Feedback</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
            aria-label="Close"
          >
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Feedback form */}
        <form onSubmit={handleSubmit}>
          {/* Feedback type selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Feedback Type
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-primary focus:ring-primary"
                  name="feedbackType"
                  value="bug"
                  checked={type === 'bug'}
                  onChange={() => setType('bug')}
                />
                <span className="ml-2">Bug Report</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-primary focus:ring-primary"
                  name="feedbackType"
                  value="feature"
                  checked={type === 'feature'}
                  onChange={() => setType('feature')}
                />
                <span className="ml-2">Feature Request</span>
              </label>
            </div>
          </div>

          {/* Description field */}
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              rows="4"
              placeholder={type === 'bug' ? 'Please describe the issue you encountered...' : 'Please describe your feature idea...'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            ></textarea>
          </div>

          {/* Email field (optional) */}
          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email (optional)
            </label>
            <input
              type="email"
              id="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              Provide your email if you'd like to receive updates about this {type === 'bug' ? 'bug report' : 'feature request'}.
            </p>
          </div>

          {/* Submission result message */}
          {showResult && (
            <div 
              className={`mb-4 p-3 rounded-md ${
                submitResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              {submitResult.message}
            </div>
          )}

          {/* Form buttons */}
          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline" 
              type="button" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              type="submit"
              disabled={isSubmitting || !description.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal; 