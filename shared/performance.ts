// Performance optimization configuration
export const PERFORMANCE_CONFIG = {
  // File upload limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES_PER_REQUEST: 1,
  
  // API rate limiting
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // Cache settings
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  MAX_CACHE_SIZE: 100, // items
  
  // AI model settings
  CHAT_MODEL: "gemini-1.5-flash",
  EMBEDDING_MODEL: "embedding-001",
  
  // Response optimization
  MAX_CONTEXT_LENGTH: 4000,
  MAX_SOURCES_PER_RESPONSE: 5,
  
  // UI optimization
  DEBOUNCE_DELAY: 300, // ms
  AUTO_SCROLL_THRESHOLD: 100, // pixels
  
  // Memory management
  MAX_MEMORY_USAGE: 512 * 1024 * 1024, // 512MB
  GARBAGE_COLLECTION_INTERVAL: 30 * 1000, // 30 seconds
} as const;

// Utility functions for performance optimization
export const PerformanceUtils = {
  // Debounce function for input handling
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },

  // Throttle function for scroll events
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  },

  // Memory usage monitoring
  getMemoryUsage: () => {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        rss: Math.round(usage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
        external: Math.round(usage.external / 1024 / 1024), // MB
      };
    }
    return null;
  },

  // Performance timing utilities
  measureTime: async <T>(fn: () => Promise<T>, label: string): Promise<T> => {
    const start = performance.now();
    try {
      const result = await fn();
      const end = performance.now();
      console.log(`${label}: ${(end - start).toFixed(2)}ms`);
      return result;
    } catch (error) {
      const end = performance.now();
      console.error(`${label} failed after ${(end - start).toFixed(2)}ms:`, error);
      throw error;
    }
  },
};
