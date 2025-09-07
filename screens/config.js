// config.js - Updated with Movement Analysis Support
export const API_CONFIG = {
  BASE_URL: 'https://8735895bb1da.ngrok-free.app', // Replace with your backend URL
  API_KEY: 'b747416a-bf1b-4417-af5a-25c2996507af', // API key for pose tracker
  PROTOCOL: 'https', // Change to 'https' for production
  
  // Timeout for API requests (in milliseconds)
  TIMEOUT: 30000, // 30 seconds
  
  // Movement Analysis specific configuration
  MOVEMENT_ANALYSIS: {
    // Maximum video file size (in bytes) - 100MB
    MAX_FILE_SIZE: 100 * 1024 * 1024,
    
    // Maximum video duration (in seconds) - 5 minutes
    MAX_DURATION: 300,
    
    // Supported video formats
    SUPPORTED_FORMATS: ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime', 'video/webm'],
    
    // Analysis endpoints
    ENDPOINTS: {
      UPLOAD: '/movement-analysis/upload',
      ANALYZE: '/movement-analysis/analyze',
      RESULTS: '/movement-analysis/results',
      LIST: '/movement-analysis/list',
      DASHBOARD: '/movement-analysis/dashboard'
    }
  },
  
  // Existing pose tracking configuration
  POSE_TRACKING: {
    ENDPOINT: '/pose_tracker/tracking'
  },
  
  // Video comparison endpoints
  VIDEO_COMPARISON: {
    UPLOAD: '/uploads',
    COMPARE: '/compare'
  },
  
  // 3D Pose estimation endpoints
  POSE_3D: {
    UPLOAD: '/uploads',
    PROCESS: '/process-multi-view-poses'
  }
};

// Utility function to get full API URL
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Utility function to get movement analysis URL
export const getMovementAnalysisUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.MOVEMENT_ANALYSIS.ENDPOINTS[endpoint]}`;
};

// Helper function to validate video file
export const validateVideoFile = (file) => {
  const errors = [];
  
  // Check file size
  if (file.size && file.size > API_CONFIG.MOVEMENT_ANALYSIS.MAX_FILE_SIZE) {
    errors.push('File size exceeds 100MB limit');
  }
  
  // Check duration
  if (file.duration && file.duration > API_CONFIG.MOVEMENT_ANALYSIS.MAX_DURATION * 1000) {
    errors.push('Video duration exceeds 5 minute limit');
  }
  
  // Check format
  if (file.type && !API_CONFIG.MOVEMENT_ANALYSIS.SUPPORTED_FORMATS.includes(file.type)) {
    errors.push('Unsupported video format');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper function to log API calls in development
export const logApiCall = (method, url, data = null) => {
  if (__DEV__) {
    console.log(`🌐 API ${method.toUpperCase()}: ${url}`);
    if (data) {
      console.log('📤 Request data:', data);
    }
  }
};

// Helper function to handle API errors
export const handleApiError = (error, context = '') => {
  if (__DEV__) {
    console.error(`❌ API Error ${context}:`, error);
  }
  
  // Return user-friendly error message
  if (error.response) {
    // Server responded with error status
    return {
      message: error.response.data?.detail || error.response.data?.message || 'Server error occurred',
      status: error.response.status,
      type: 'server_error'
    };
  } else if (error.request) {
    // Network error
    return {
      message: 'Network error. Please check your connection.',
      status: 0,
      type: 'network_error'
    };
  } else {
    // Other error
    return {
      message: error.message || 'An unexpected error occurred',
      status: 0,
      type: 'unknown_error'
    };
  }
};