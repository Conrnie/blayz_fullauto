// Smooth scrolling for all anchor links
document.addEventListener('DOMContentLoaded', function() {
    // Add smooth scrolling to all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Add scroll animation for elements
    const animatedElements = document.querySelectorAll('.fade-in-element');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fadeIn');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });
    
    animatedElements.forEach(element => {
        observer.observe(element);
    });

    // Mobile menu functionality
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Add "fade-in-element" class to sections for scroll animations
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        section.classList.add('fade-in-element');
        section.style.opacity = '0'; // Start invisible
    });
});

// Form submission handler for the beta signup
const betaSignupForm = document.getElementById('beta-signup-form');
if (betaSignupForm) {
    betaSignupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get the email input value
        const emailInput = this.querySelector('input[type="email"]');
        const email = emailInput ? emailInput.value : '';
        
        if (email) {
            // Here you would typically send this to your backend
            console.log('Beta signup:', email);
            
            // Show success message
            const successMessage = document.getElementById('signup-success');
            if (successMessage) {
                successMessage.classList.remove('hidden');
            }
            
            // Reset form
            this.reset();
        }
    });
} 