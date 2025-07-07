import React from 'react';

/**
 * Floating Feedback Button to trigger the feedback modal
 * @param {Object} props - Component props
 * @param {Function} props.onClick - Function to open the feedback modal
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element}
 */
const FeedbackButton = ({ onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-primary shadow-lg hover:bg-primary/90 text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 ${className}`}
      aria-label="Provide Feedback"
      title="Report a bug or suggest a feature"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className="w-7 h-7"
      >
        <path 
          fillRule="evenodd" 
          d="M12 2.25c-2.429 0-4.817.178-7.152.521C2.87 3.061 1.5 4.795 1.5 6.741v6.018c0 1.946 1.37 3.68 3.348 3.97.877.129 1.761.234 2.652.316V21a.75.75 0 001.28.53l4.184-4.183a.39.39 0 01.266-.112c2.006-.05 3.982-.22 5.922-.506 1.978-.29 3.348-2.023 3.348-3.97V6.741c0-1.947-1.37-3.68-3.348-3.97A49.145 49.145 0 0012 2.25z" 
          clipRule="evenodd" 
        />
      </svg>
    </button>
  );
};

export default FeedbackButton; 