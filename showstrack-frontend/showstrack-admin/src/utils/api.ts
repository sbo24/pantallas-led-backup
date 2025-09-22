// API Configuration Utilities - ShowsTrack Frontend
// Centralized API URL detection for all services

/**
 * Determines the correct API base URL based on the current environment
 * Automatically detects if accessing via external IP and uses appropriate backend URL
 */
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  
  // If accessing Vue via external IP, use external backend URL
  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname
    
    // Add more IPs here for different environments
    const externalIpMappings: Record<string, string> = {
      '172.26.131.240': 'http://172.26.131.240:8001'
      // Add future environments here:
      // 'production-ip': 'https://api.showstrack.com'
      // 'staging-ip': 'https://api-staging.showstrack.com'
    }
    
    if (externalIpMappings[currentHost]) {
      const externalUrl = externalIpMappings[currentHost]
      if (import.meta.env.DEV) {
        console.log(`[API Config] External access detected. Using: ${externalUrl}`)
      }
      return externalUrl
    }
  }
  
  if (import.meta.env.DEV) {
    console.log(`[API Config] Local access. Using: ${envUrl}`)
  }
  
  return envUrl
}

/**
 * Gets API base URL with service name for logging
 */
export const getApiBaseUrlWithLogging = (serviceName: string): string => {
  const url = getApiBaseUrl()
  
  if (import.meta.env.DEV) {
    console.log(`[${serviceName}] Using API URL: ${url}`)
  }
  
  return url
}