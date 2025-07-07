import React from 'react';

/**
 * Button component with various styles
 * @param {Object} props - Component props
 * @param {string} props.variant - Button variant (primary, secondary, outline)
 * @param {boolean} props.fullWidth - Whether the button should take full width
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Button content
 * @returns {JSX.Element}
 */
const Button = ({ 
  variant = 'primary', 
  type = 'button',
  fullWidth = false, 
  className = '', 
  children, 
  ...props 
}) => {
  const baseClasses = 'py-2 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors';
  
  const variantClasses = {
    primary: 'bg-primary hover:bg-primary/90 text-white focus:ring-primary/50',
    secondary: 'bg-secondary hover:bg-secondary/90 text-white focus:ring-secondary/50',
    outline: 'border border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary/50',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500/50',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500/50',
  };
  
  const widthClass = fullWidth ? 'w-full' : '';
  
  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
