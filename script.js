// Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx-kJLPHS76WuLBrQKcz1bg5LAuvbkUWW_Htv1ojFu9cxMGEQZoYbDIRwXnDmfFFplW/exec';

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Set minimum date to today
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today; // Set default to today
    
    // Display current date
    const currentDateElement = document.getElementById('current-date');
    const now = new Date();
    currentDateElement.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Initialize day display for today
    const dayDisplay = document.getElementById('day-display');
    dayDisplay.innerHTML = `<span class="day-name">${now.toLocaleDateString('en-US', { weekday: 'long' })}</span>`;
    
    // Initialize date change listener
    dateInput.addEventListener('change', handleDateChange);
    
    // Initialize form submission
    const bookingForm = document.getElementById('booking-form');
    bookingForm.addEventListener('submit', handleFormSubmit);
    
    // Initialize new booking button
    const newBookingBtn = document.getElementById('new-booking-btn');
    newBookingBtn.addEventListener('click', resetForm);
    
    // Load time slots for today initially
    handleDateChange();
    
    // Add real-time validation
    setupFormValidation();
});

// Handle date change
async function handleDateChange() {
    const dateInput = document.getElementById('date');
    const dayDisplay = document.getElementById('day-display');
    const timeSlotsContainer = document.getElementById('time-slots');
    
    // Update day display
    if (dateInput.value) {
        const selectedDate = new Date(dateInput.value);
        const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
        dayDisplay.innerHTML = `<span class="day-name">${dayName}</span>`;
    } else {
        dayDisplay.innerHTML = '<span class="placeholder">Select a date to see the day</span>';
    }
    
    // Show loading state for time slots
    timeSlotsContainer.innerHTML = `
        <div class="loading-slots">
            <i class="fas fa-spinner fa-spin"></i> Loading available time slots...
        </div>
    `;
    
    // Load booked slots for the selected date
    if (dateInput.value) {
        await loadBookedSlots(dateInput.value);
    }
}

// Load booked slots from Google Sheets
async function loadBookedSlots(selectedDate) {
    const timeSlotsContainer = document.getElementById('time-slots');
    
    try {
        console.log('Fetching booked slots for date:', selectedDate);
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getBookings&date=${selectedDate}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Booked slots response:', data);
        
        if (data.success) {
            generateTimeSlots(selectedDate, data.bookedSlots || []);
        } else {
            throw new Error(data.error || 'Failed to load booked slots');
        }
    } catch (error) {
        console.error('Error loading booked slots:', error);
        
        // Show error but still generate slots
        timeSlotsContainer.innerHTML = `
            <div class="loading-slots">
                <i class="fas fa-exclamation-triangle"></i> Could not check availability. All slots shown as available.
            </div>
        `;
        
        // Generate slots with empty booked slots array
        setTimeout(() => {
            generateTimeSlots(selectedDate, []);
        }, 500);
    }
}

// Generate time slots
function generateTimeSlots(date, bookedSlots) {
    const timeSlotsContainer = document.getElementById('time-slots');
    timeSlotsContainer.innerHTML = '';
    
    // Create time slots from 8:00 AM to 6:00 PM (40-minute intervals)
    const startHour = 8;
    const endHour = 18;
    const slotDuration = 40; // minutes
    
    let availableSlots = 0;
    
    for (let hour = startHour; hour < endHour; hour++) {
        for (let minutes = 0; minutes < 60; minutes += slotDuration) {
            // Skip slots that would go beyond endHour
            if (hour === endHour - 1 && minutes + slotDuration > 60) {
                continue;
            }
            
            const startTime = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            const endMinutes = (minutes + slotDuration) % 60;
            const endHourAdjusted = minutes + slotDuration >= 60 ? hour + 1 : hour;
            const endTime = `${endHourAdjusted.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
            
            const timeSlot = `${startTime} - ${endTime}`;
            const slotId = `${date}_${startTime.replace(':', '')}`;
            
            // Check if this slot is booked
            const isBooked = bookedSlots.includes(timeSlot);
            
            const slotElement = document.createElement('div');
            slotElement.className = `time-slot ${isBooked ? 'booked' : 'available'}`;
            slotElement.dataset.slot = timeSlot;
            slotElement.dataset.id = slotId;
            slotElement.textContent = timeSlot;
            
            if (!isBooked) {
                slotElement.addEventListener('click', selectTimeSlot);
                availableSlots++;
            } else {
                slotElement.title = 'This slot is already booked';
            }
            
            timeSlotsContainer.appendChild(slotElement);
        }
    }
    
    // Add message if no slots available
    if (availableSlots === 0) {
        timeSlotsContainer.innerHTML = `
            <div class="loading-slots">
                <i class="fas fa-calendar-times"></i> No available time slots for ${date}. Please select another date.
            </div>
        `;
    }
    
    updateSubmitButtonState();
}

// Handle time slot selection
function selectTimeSlot(event) {
    const selectedSlot = event.currentTarget;
    const previouslySelected = document.querySelector('.time-slot.selected');
    
    // Deselect previously selected slot
    if (previouslySelected && previouslySelected !== selectedSlot) {
        previouslySelected.classList.remove('selected');
    }
    
    // Toggle selection
    selectedSlot.classList.toggle('selected');
    
    // Update submit button state
    updateSubmitButtonState();
}

// Update submit button state based on form completion
function updateSubmitButtonState() {
    const form = document.getElementById('booking-form');
    const submitBtn = document.getElementById('submit-btn');
    const isFormValid = form.checkValidity() && document.querySelector('.time-slot.selected');
    
    submitBtn.disabled = !isFormValid;
}

// Setup form validation
function setupFormValidation() {
    const form = document.getElementById('booking-form');
    const inputs = form.querySelectorAll('input[required], select[required]');
    
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            if (this.classList.contains('invalid')) {
                validateField(this);
            }
            updateSubmitButtonState();
        });
    });
    
    // Phone number validation
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', function() {
        // Remove non-digit characters except plus sign
        this.value = this.value.replace(/[^\d+]/g, '');
        validateField(this);
    });
}

// Validate individual field
function validateField(element) {
    if (!element.value.trim()) {
        markInvalid(element, 'This field is required');
        return false;
    }
    
    if (element.id === 'phone') {
        // Simple phone validation - at least 10 digits
        const digits = element.value.replace(/\D/g, '');
        if (digits.length < 10) {
            markInvalid(element, 'Please enter a valid phone number (at least 10 digits)');
            return false;
        }
    }
    
    markValid(element);
    return true;
}

function markInvalid(element, message) {
    element.classList.add('invalid');
    element.classList.remove('valid');
    element.style.borderColor = 'var(--danger-color)';
    element.style.boxShadow = '0 0 0 3px rgba(247, 37, 133, 0.2)';
    
    // Show error message
    let errorElement = element.nextElementSibling;
    if (!errorElement || !errorElement.classList.contains('error-message')) {
        errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        element.parentNode.appendChild(errorElement);
    }
    errorElement.textContent = message;
}

function markValid(element) {
    element.classList.remove('invalid');
    element.classList.add('valid');
    element.style.borderColor = 'var(--success-color)';
    element.style.boxShadow = '0 0 0 3px rgba(76, 175, 80, 0.2)';
    
    // Remove error message
    const errorElement = element.nextElementSibling;
    if (errorElement && errorElement.classList.contains('error-message')) {
        errorElement.remove();
    }
}

// Form validation
function validateForm() {
    const form = document.getElementById('booking-form');
    const inputs = form.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!validateField(input)) {
            isValid = false;
        }
    });
    
    // Check if a time slot is selected
    if (!document.querySelector('.time-slot.selected')) {
        alert('Please select a time slot.');
        isValid = false;
    }
    
    return isValid;
}

// Handle form submission - FIXED VERSION
async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    // Show loading overlay
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'flex';
    
    // Collect form data
    const formData = {
        name: document.getElementById('name').value.trim(),
        address: document.getElementById('address').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        date: document.getElementById('date').value,
        day: document.querySelector('.day-name').textContent,
        timeSlot: document.querySelector('.time-slot.selected').dataset.slot,
        testType: document.getElementById('test-type').value,
        timestamp: new Date().toISOString()
    };
    
    console.log('Submitting booking:', formData);
    
    try {
        // Submit to Google Apps Script - FIXED: Removed mode: 'no-cors'
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Response data:', result);
        
        if (result.success) {
            // Success - show confirmation
            loadingOverlay.style.display = 'none';
            showConfirmation(formData, result.bookingId || generateReferenceId());
            
            // Refresh slots for the booked date
            setTimeout(() => {
                loadBookedSlots(formData.date);
            }, 1000);
            
        } else {
            // Error from server
            loadingOverlay.style.display = 'none';
            alert(`Booking failed: ${result.error || result.message}`);
            
            // Refresh slots in case of duplicate booking
            if (result.error && result.error.includes('already booked')) {
                await loadBookedSlots(formData.date);
            }
        }
        
    } catch (error) {
        console.error('Error submitting form:', error);
        loadingOverlay.style.display = 'none';
        
        // Try alternative approach - using GET instead of POST
        const useAlternative = confirm('Unable to connect to server. Try alternative method?');
        if (useAlternative) {
            tryAlternativeSubmission(formData);
        } else {
            alert('There was an error submitting your booking. Please try again.\nError: ' + error.message);
        }
    }
}

// Alternative submission method using GET (for testing)
async function tryAlternativeSubmission(formData) {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'flex';
    
    // Convert to URL parameters
    const params = new URLSearchParams();
    for (const key in formData) {
        params.append(key, formData[key]);
    }
    
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params.toString()}&action=submit`);
        const result = await response.json();
        
        loadingOverlay.style.display = 'none';
        if (result.success) {
            showConfirmation(formData, result.bookingId || generateReferenceId());
        } else {
            alert('Booking failed: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        loadingOverlay.style.display = 'none';
        alert('Alternative method also failed. Please check your connection.');
    }
}

// Show confirmation message
function showConfirmation(bookingData, bookingId) {
    const bookingForm = document.getElementById('booking-form');
    const confirmationPanel = document.getElementById('confirmation-panel');
    const bookingDetails = document.getElementById('booking-details');
    
    // Format date for display
    const formattedDate = new Date(bookingData.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Populate booking details
    bookingDetails.innerHTML = `
        <div class="detail-row">
            <span>Booking ID:</span>
            <strong>${bookingId}</strong>
        </div>
        <div class="detail-row">
            <span>Name:</span>
            <strong>${bookingData.name}</strong>
        </div>
        <div class="detail-row">
            <span>Date:</span>
            <strong>${formattedDate}</strong>
        </div>
        <div class="detail-row">
            <span>Time Slot:</span>
            <strong>${bookingData.timeSlot}</strong>
        </div>
        <div class="detail-row">
            <span>Test Type:</span>
            <strong>Test Type ${bookingData.testType}</strong>
        </div>
        <div class="detail-row">
            <span>Phone:</span>
            <strong>${bookingData.phone}</strong>
        </div>
        <div class="detail-row">
            <span>Status:</span>
            <strong style="color: var(--success-color);">Confirmed ✓</strong>
        </div>
    `;
    
    // Hide form and show confirmation
    bookingForm.style.display = 'none';
    confirmationPanel.style.display = 'block';
    
    // Scroll to confirmation
    confirmationPanel.scrollIntoView({ behavior: 'smooth' });
}

// Generate a random reference ID
function generateReferenceId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'REF-';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Reset form for new booking
function resetForm() {
    const bookingForm = document.getElementById('booking-form');
    const confirmationPanel = document.getElementById('confirmation-panel');
    
    // Reset form
    bookingForm.reset();
    bookingForm.style.display = 'block';
    
    // Hide confirmation
    confirmationPanel.style.display = 'none';
    
    // Reset to today's date
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    
    // Reset day display
    const now = new Date();
    const dayDisplay = document.getElementById('day-display');
    dayDisplay.innerHTML = `<span class="day-name">${now.toLocaleDateString('en-US', { weekday: 'long' })}</span>`;
    
    // Clear selected time slot
    const selectedSlot = document.querySelector('.time-slot.selected');
    if (selectedSlot) {
        selectedSlot.classList.remove('selected');
    }
    
    // Reset validation styles
    const inputs = bookingForm.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.classList.remove('invalid', 'valid');
        input.style.borderColor = '';
        input.style.boxShadow = '';
        
        const errorElement = input.nextElementSibling;
        if (errorElement && errorElement.classList.contains('error-message')) {
            errorElement.remove();
        }
    });
    
    // Load slots for today
    handleDateChange();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Add real-time validation listeners
document.querySelectorAll('#booking-form input, #booking-form select').forEach(input => {
    input.addEventListener('input', updateSubmitButtonState);
    input.addEventListener('change', updateSubmitButtonState);
});
