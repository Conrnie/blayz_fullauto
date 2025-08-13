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

    // Lead tracking for static landing page
    (function() {
        var n8nEndpoint = 'https://primary-production-7c692.up.railway.app/webhook-test/1215bb41-310d-44fe-a540-281e6e377dc1';

        function getLeadId() {
            try {
                var params = new URLSearchParams(window.location.search);
                var id = params.get('lead_id');
                if (id) return id;
                var l = params.get('l');
                if (l) {
                    if (/^\d+$/.test(l)) return l; // plain numeric id
                    try { return atob(decodeURIComponent(l)); } catch (e) { return l; }
                }
                return null;
            } catch (e) { return null; }
        }

        function postEvent(eventName, extra) {
            var storedId = localStorage.getItem('lead_id');
            if (!storedId) return;
            var payload = {
                event: eventName,
                lead_id: storedId,
                url: window.location.href,
                referrer: document.referrer || null,
                ua: navigator.userAgent,
                timestamp: new Date().toISOString()
            };
            if (extra) { for (var k in extra) { payload[k] = extra[k]; } }
            try {
                console.log('[tracking] posting', payload);
                fetch(n8nEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    keepalive: true,
                    body: JSON.stringify(payload)
                }).then(function(r){
                    console.log('[tracking] response status', r.status);
                }).catch(function(err){
                    console.warn('[tracking] post failed', err);
                });
            } catch (e) {}
        }

        var leadId = getLeadId();
        if (leadId) localStorage.setItem('lead_id', leadId);
        var force = new URLSearchParams(window.location.search).get('force') === '1';
        if (localStorage.getItem('lead_id') && (!sessionStorage.getItem('lp_visit_fired') || force)) {
            postEvent('visited_landingpage');
            sessionStorage.setItem('lp_visit_fired', '1');
        }

        // Attach form submit tracking and ensure hidden lead_id field is present
        ['beta-signup-form', 'beta-signup-form-2'].forEach(function(formId) {
            var form = document.getElementById(formId);
            if (!form) return;
            if (!form.querySelector('input[name="lead_id"]')) {
                var hidden = document.createElement('input');
                hidden.type = 'hidden';
                hidden.name = 'lead_id';
                hidden.value = localStorage.getItem('lead_id') || '';
                form.appendChild(hidden);
            }
            if (!form.__signupBound) {
                form.addEventListener('submit', function() {
                    postEvent('form_submit');
                });
                form.__signupBound = true;
            }
        });
    })();
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