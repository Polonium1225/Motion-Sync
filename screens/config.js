// Add this to your existing config.js file to extend the MOVEMENT_ANALYSIS section

// Update your existing MOVEMENT_ANALYSIS object with these additional properties:
export const API_CONFIG = {
  BASE_URL: 'https://3da4fc1eca95.ngrok-free.app', // Your existing URL
  API_KEY: 'b747416a-bf1b-4417-af5a-25c2996507af', // Your existing API key
  PROTOCOL: 'https',
  
  // Timeout for API requests (in milliseconds)
  TIMEOUT: 30000, // 30 seconds
  
  // Enhanced Movement Analysis configuration
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
      STATUS: '/movement-analysis/status',
      RESULTS: '/movement-analysis/results',
      ANALYZE: '/movement-analysis/analyze',
      LIST: '/movement-analysis/list',
      DASHBOARD: '/movement-analysis/dashboard',
      SUPPORTED_MOVEMENTS: '/movement-analysis/supported-movements',
      DELETE: '/movement-analysis'
    },
    
    // Analysis configuration
    POLLING_INTERVAL: 2000, // 2 seconds
    MAX_POLLING_ATTEMPTS: 30, // 1 minute total
    SUPPORTED_MOVEMENTS: ['squats'], // Will be expanded
    
    // File validation rules
    MIN_DURATION: 5, // Minimum 5 seconds
    MAX_FILE_SIZE_MB: 100,
    ALLOWED_EXTENSIONS: ['mp4', 'mov', 'avi', 'webm']
  },
  
  // Your existing configurations...
  POSE_TRACKING: {
    ENDPOINT: '/pose_tracker/tracking'
  },
  
  VIDEO_COMPARISON: {
    UPLOAD: '/uploads',
    COMPARE: '/compare'
  },
  
  POSE_3D: {
    UPLOAD: '/uploads',
    PROCESS: '/process-multi-view-poses'
  }
};

// Enhanced utility function to get movement analysis URL
export const getMovementAnalysisUrl = (endpoint) => {
  const endpointPath = API_CONFIG.MOVEMENT_ANALYSIS.ENDPOINTS[endpoint.toUpperCase()];
  if (!endpointPath) {
    throw new Error(`Unknown movement analysis endpoint: ${endpoint}`);
  }
  return `${API_CONFIG.BASE_URL}${endpointPath}`;
};

// Enhanced helper function to validate video file
export const validateVideoFile = (file) => {
  const errors = [];
  
  if (!file) {
    return { isValid: false, errors: ['No file selected'] };
  }
  
  // Check file size
  if (file.size && file.size > API_CONFIG.MOVEMENT_ANALYSIS.MAX_FILE_SIZE) {
    errors.push(`File size exceeds ${API_CONFIG.MOVEMENT_ANALYSIS.MAX_FILE_SIZE_MB}MB limit`);
  }
  
  // Check duration if available
  if (file.duration) {
    const durationInSeconds = file.duration / 1000; // Convert from milliseconds
    if (durationInSeconds > API_CONFIG.MOVEMENT_ANALYSIS.MAX_DURATION) {
      errors.push(`Video duration exceeds ${API_CONFIG.MOVEMENT_ANALYSIS.MAX_DURATION / 60} minute limit`);
    }
    if (durationInSeconds < API_CONFIG.MOVEMENT_ANALYSIS.MIN_DURATION) {
      errors.push(`Video must be at least ${API_CONFIG.MOVEMENT_ANALYSIS.MIN_DURATION} seconds long`);
    }
  }
  
  // Check format
  if (file.name) {
    const extension = file.name.split('.').pop().toLowerCase();
    if (!API_CONFIG.MOVEMENT_ANALYSIS.ALLOWED_EXTENSIONS.includes(extension)) {
      errors.push(`Unsupported format. Supported: ${API_CONFIG.MOVEMENT_ANALYSIS.ALLOWED_EXTENSIONS.join(', ')}`);
    }
  }
  
  // Check MIME type if available
  if (file.type && !API_CONFIG.MOVEMENT_ANALYSIS.SUPPORTED_FORMATS.includes(file.type)) {
    errors.push('Unsupported video format');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper function to get status endpoint URL
export const getStatusUrl = (analysisId) => {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.MOVEMENT_ANALYSIS.ENDPOINTS.STATUS}/${analysisId}`;
};

// Helper function to get results endpoint URL
export const getResultsUrl = (analysisId) => {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.MOVEMENT_ANALYSIS.ENDPOINTS.RESULTS}/${analysisId}`;
};

// Helper function to check if movement analysis backend is available
export const checkMovementAnalysisHealth = async () => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
      timeout: 5000
    });
    
    if (response.ok) {
      const result = await response.json();
      return {
        available: true,
        status: result.status,
        message: result.message
      };
    }
    
    return { available: false, message: 'Health check failed' };
  } catch (error) {
    console.error('Health check error:', error);
    return { 
      available: false, 
      message: error.message || 'Connection failed' 
    };
  }
};

// Helper function to log API calls in development
export const logApiCall = (method, url, data = null) => {
  if (__DEV__) {
    console.log(`🌐 Movement Analysis API ${method.toUpperCase()}: ${url}`);
    if (data) {
      console.log('📤 Request data:', data);
    }
  }
};