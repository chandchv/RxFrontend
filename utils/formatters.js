/**
 * Format a number as currency (Indian Rupees)
 * 
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  // Check if amount is defined and is a number
  if (amount === undefined || amount === null) {
    return '₹0.00';
  }
  
  // Convert to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Format as Indian currency
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numAmount);
};

/**
 * Format a date string into a more readable format
 * 
 * @param {string} dateString - ISO date string or valid date input
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    // Format as DD MMM YYYY (e.g., 01 Jan 2023)
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Error';
  }
};

/**
 * Format a timestamp to include both date and time
 * 
 * @param {string} timestamp - ISO date string or valid date input
 * @returns {string} Formatted timestamp string
 */
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  try {
    const date = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    // Format as DD MMM YYYY, HH:MM (e.g., 01 Jan 2023, 14:30)
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Error';
  }
};

/**
 * Format a relative time (e.g., "2 days ago", "just now")
 * 
 * @param {string} dateString - ISO date string or valid date input
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      // If more than a week ago, return the regular date format
      return formatDate(dateString);
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Error';
  }
};

/**
 * Format a time string (HH:MM)
 * 
 * @param {string} timeString - Time string in HH:MM format
 * @returns {string} Formatted time string
 */
export const formatTime = (timeString) => {
  if (!timeString) return 'N/A';
  
  try {
    // Create a date object for today with the specified time
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Time';
    }
    
    // Format as HH:MM AM/PM (e.g., 2:30 PM)
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeString; // Return original if formatting fails
  }
}; 