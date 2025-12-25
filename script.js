// Google Apps Script Web App URL (You need to replace this with your own)
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx-kJLPHS76WuLBrQKcz1bg5LAuvbkUWW_Htv1ojFu9cxMGEQZoYbDIRwXnDmfFFplW/exec';

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Set minimum date to today
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    
    // Display current date
    const currentDateElement = document.getElementById('current-date');
    const now = new Date();
    currentDateElement.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
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
        // In a real implementation, you would fetch booked slots from Google Sheets
        // For now, we'll simulate with mock data
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getBookings&date=${selectedDate}`);
        const data = await response.json();
        
        // Generate time slots (8:00 AM to 6:00 PM, 40-minute slots)
        generateTimeSlots(selectedDate, data.bookedSlots || []);
    } catch (error) {
        console.error('Error loading booked slots:', error);
        // Fallback to generating slots without checking availability
        generateTimeSlots(selectedDate, []);
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
            slotElement.className = `time-slot ${isBooked ? 'booked' : ''}`;
            slotElement.dataset.slot = timeSlot;
            slotElement.dataset.id = slotId;
            slotElement.textContent = timeSlot;
            
            if (!isBooked) {
                slotElement.addEventListener('click', selectTimeSlot);
            }
            
            timeSlotsContainer.appendChild(slotElement);
        }
    }
    
    // Add message if no slots available
    if (timeSlotsContainer.children.length === 0) {
        timeSlotsContainer.innerHTML = '<div class="loading-slots">No time slots available for this date.</div>';
    }
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

// Form validation
function validateForm() {
    const form = document.getElementById('booking-form');
    const inputs = form.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
            highlightInvalid(input);
        } else {
            removeHighlight(input);
        }
    });
    
    // Check if a time slot is selected
    if (!document.querySelector('.time-slot.selected')) {
        alert('Please select a time slot.');
        isValid = false;
    }
    
    return isValid;
}

function highlightInvalid(element) {
    element.style.borderColor = 'var(--danger-color)';
    element.style.boxShadow = '0 0 0 3px rgba(247, 37, 133, 0.2)';
}

function removeHighlight(element) {
    element.style.borderColor = '#ddd';
    element.style.boxShadow = 'none';
}

// Handle form submission
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
        name: document.getElementById('name').value,
        address: document.getElementById('address').value,
        phone: document.getElementById('phone').value,
        date: document.getElementById('date').value,
        day: document.querySelector('.day-name').textContent,
        timeSlot: document.querySelector('.time-slot.selected').dataset.slot,
        testType: document.getElementById('test-type').value,
        timestamp: new Date().toISOString()
    };
    
    try {
        // Submit to Google Apps Script
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Note: no-cors mode doesn't allow reading response
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        // Simulate successful submission (in real app, handle response)
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            showConfirmation(formData);
        }, 1500);
        
    } catch (error) {
        console.error('Error submitting form:', error);
        loadingOverlay.style.display = 'none';
        alert('There was an error submitting your booking. Please try again.');
    }
}

// Show confirmation message
function showConfirmation(bookingData) {
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
            <strong>${bookingData.testType}</strong>
        </div>
        <div class="detail-row">
            <span>Phone:</span>
            <strong>${bookingData.phone}</strong>
        </div>
        <div class="detail-row">
            <span>Reference ID:</span>
            <strong>${generateReferenceId()}</strong>
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
    
    // Reset time slots
    const selectedDate = document.getElementById('date').value;
    if (selectedDate) {
        loadBookedSlots(selectedDate);
    }
    
    // Reset day display
    const dayDisplay = document.getElementById('day-display');
    if (selectedDate) {
        const date = new Date(selectedDate);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        dayDisplay.innerHTML = `<span class="day-name">${dayName}</span>`;
    } else {
        dayDisplay.innerHTML = '<span class="placeholder">Select a date to see the day</span>';
    }
    
    // Clear selected time slot
    const selectedSlot = document.querySelector('.time-slot.selected');
    if (selectedSlot) {
        selectedSlot.classList.remove('selected');
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Add event listeners to form inputs for real-time validation
document.querySelectorAll('#booking-form input, #booking-form select').forEach(input => {
    input.addEventListener('input', updateSubmitButtonState);
    input.addEventListener('change', updateSubmitButtonState);
});