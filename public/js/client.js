// Client-side JavaScript for BryandB Property Coordinator
// Provides form validation, date handling, and UX enhancements

(function() {
    'use strict';

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        setupDateValidation();
        setupFormValidation();
        setupConfirmations();
        setupAutoDateAdjustment();
        enhanceAlerts();
    }

    // Date validation for booking forms
    function setupDateValidation() {
        const startDateInput = document.getElementById('startDate') || document.getElementById('start');
        const endDateInput = document.getElementById('endDate') || document.getElementById('end');

        if (!startDateInput || !endDateInput) return;

        // Set minimum dates to today
        const today = new Date().toISOString().split('T')[0];
        startDateInput.setAttribute('min', today);
        endDateInput.setAttribute('min', today);

        // Update end date minimum when start date changes
        startDateInput.addEventListener('change', function() {
            const startValue = this.value;
            if (startValue) {
                endDateInput.setAttribute('min', startValue);
                
                // If end date is before start date, clear it
                if (endDateInput.value && endDateInput.value < startValue) {
                    endDateInput.value = '';
                    showFieldError(endDateInput, 'Check-out must be after check-in');
                }
            }
        });

        // Validate end date is after start date
        endDateInput.addEventListener('change', function() {
            const startValue = startDateInput.value;
            const endValue = this.value;

            if (startValue && endValue && endValue <= startValue) {
                showFieldError(this, 'Check-out must be after check-in');
                this.value = '';
            } else {
                clearFieldError(this);
                
                // Calculate and show duration
                if (startValue && endValue) {
                    const nights = calculateNights(startValue, endValue);
                    showDurationHint(nights);
                }
            }
        });
    }

    // Form validation before submission
    function setupFormValidation() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            form.addEventListener('submit', function(e) {
                const requiredInputs = this.querySelectorAll('[required]');
                let isValid = true;

                requiredInputs.forEach(input => {
                    if (!input.value.trim()) {
                        showFieldError(input, 'This field is required');
                        isValid = false;
                    }
                });

                // Email validation
                const emailInputs = this.querySelectorAll('[type="email"]');
                emailInputs.forEach(input => {
                    if (input.value && !isValidEmail(input.value)) {
                        showFieldError(input, 'Please enter a valid email address');
                        isValid = false;
                    }
                });

                // Date validation
                const startDate = this.querySelector('#startDate, #start');
                const endDate = this.querySelector('#endDate, #end');
                
                if (startDate && endDate && startDate.value && endDate.value) {
                    if (new Date(endDate.value) <= new Date(startDate.value)) {
                        showFieldError(endDate, 'Check-out must be after check-in');
                        isValid = false;
                    }
                }

                if (!isValid) {
                    e.preventDefault();
                    scrollToFirstError();
                }
            });
        });

        // Clear errors on input
        const inputs = document.querySelectorAll('.form-input, .form-select');
        inputs.forEach(input => {
            input.addEventListener('input', function() {
                clearFieldError(this);
            });
        });
    }

    // Add confirmation dialogs for destructive actions
    function setupConfirmations() {
        const dangerButtons = document.querySelectorAll('.btn--danger');
        
        dangerButtons.forEach(button => {
            // Skip if already has onclick
            if (button.hasAttribute('onclick')) return;
            
            button.addEventListener('click', function(e) {
                const action = this.textContent.trim();
                const confirmMessage = `Are you sure you want to ${action.toLowerCase()}? This action cannot be undone.`;
                
                if (!confirm(confirmMessage)) {
                    e.preventDefault();
                }
            });
        });
    }

    // Auto-adjust end date to be day after start date
    function setupAutoDateAdjustment() {
        const startDateInput = document.getElementById('startDate') || document.getElementById('start');
        const endDateInput = document.getElementById('endDate') || document.getElementById('end');

        if (!startDateInput || !endDateInput) return;

        startDateInput.addEventListener('change', function() {
            // Only auto-set if end date is empty
            if (!endDateInput.value && this.value) {
                const startDate = new Date(this.value);
                const suggestedEndDate = new Date(startDate);
                suggestedEndDate.setDate(suggestedEndDate.getDate() + 1);
                
                const endDateStr = suggestedEndDate.toISOString().split('T')[0];
                endDateInput.value = endDateStr;
                
                // Show hint
                showDurationHint(1);
            }
        });
    }

    // Make alerts dismissible
    function enhanceAlerts() {
        const alerts = document.querySelectorAll('.alert');
        
        alerts.forEach(alert => {
            // Add close button if it's a success alert
            if (alert.classList.contains('alert--success') && !alert.querySelector('.alert__close')) {
                const closeButton = document.createElement('button');
                closeButton.className = 'alert__close';
                closeButton.innerHTML = '×';
                closeButton.style.cssText = `
                    position: absolute;
                    top: var(--space-2);
                    right: var(--space-3);
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    opacity: 0.6;
                    transition: opacity var(--transition-fast);
                `;
                closeButton.addEventListener('mouseenter', function() {
                    this.style.opacity = '1';
                });
                closeButton.addEventListener('mouseleave', function() {
                    this.style.opacity = '0.6';
                });
                closeButton.addEventListener('click', function() {
                    alert.style.transition = 'opacity 0.3s, transform 0.3s';
                    alert.style.opacity = '0';
                    alert.style.transform = 'translateY(-10px)';
                    setTimeout(() => alert.remove(), 300);
                });
                
                alert.style.position = 'relative';
                alert.appendChild(closeButton);
            }

            // Auto-dismiss success alerts after 8 seconds
            if (alert.classList.contains('alert--success')) {
                setTimeout(() => {
                    alert.style.transition = 'opacity 0.5s, transform 0.5s';
                    alert.style.opacity = '0';
                    alert.style.transform = 'translateY(-10px)';
                    setTimeout(() => alert.remove(), 500);
                }, 8000);
            }
        });
    }

    // Helper Functions

    function calculateNights(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    function showDurationHint(nights) {
        const endDateInput = document.getElementById('endDate') || document.getElementById('end');
        if (!endDateInput) return;

        const formGroup = endDateInput.closest('.form-group');
        let durationHint = formGroup.querySelector('.duration-hint');
        
        if (!durationHint) {
            durationHint = document.createElement('p');
            durationHint.className = 'form-hint duration-hint';
            durationHint.style.color = 'var(--color-success)';
            durationHint.style.fontWeight = '500';
            
            const existingHint = formGroup.querySelector('.form-hint');
            if (existingHint) {
                existingHint.insertAdjacentElement('afterend', durationHint);
            } else {
                endDateInput.insertAdjacentElement('afterend', durationHint);
            }
        }

        durationHint.textContent = `✓ ${nights} ${nights === 1 ? 'night' : 'nights'} selected`;
    }

    function showFieldError(input, message) {
        clearFieldError(input);
        
        input.classList.add('input-error');
        input.style.borderColor = 'var(--color-danger)';
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error field-error';
        errorDiv.textContent = message;
        
        input.insertAdjacentElement('afterend', errorDiv);
        
        // Shake animation
        input.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(0)' }
        ], {
            duration: 400,
            easing: 'ease-in-out'
        });
    }

    function clearFieldError(input) {
        input.classList.remove('input-error');
        input.style.borderColor = '';
        
        const existingError = input.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function scrollToFirstError() {
        const firstError = document.querySelector('.form-error, .input-error');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // Status badge pulse animation for pending items
    const pendingBadges = document.querySelectorAll('.badge--pending');
    pendingBadges.forEach(badge => {
        badge.style.animation = 'pulse 2s infinite';
    });

    // Add pulse animation to CSS if not exists
    if (!document.querySelector('#pulse-animation')) {
        const style = document.createElement('style');
        style.id = 'pulse-animation';
        style.textContent = `
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
        `;
        document.head.appendChild(style);
    }

    // Loading state for forms
    const submitButtons = document.querySelectorAll('button[type="submit"]');
    submitButtons.forEach(button => {
        button.closest('form').addEventListener('submit', function() {
            button.disabled = true;
            const originalText = button.innerHTML;
            button.innerHTML = '<span class="spinner spinner--sm" style="margin-right: 8px;"></span> Processing...';
            
            // Re-enable after 5 seconds as fallback
            setTimeout(() => {
                button.disabled = false;
                button.innerHTML = originalText;
            }, 5000);
        });
    });

    console.log('🏡 BryandB Client Scripts Loaded');
})();