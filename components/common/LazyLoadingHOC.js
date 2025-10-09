import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Card } from 'react-native-paper';
import performanceOptimizationService from '../../services/performanceOptimizationService';
import theme from '../../styles/theme';

/**
 * Higher Order Component for lazy loading components
 * Optimizes performance by loading components only when needed
 */
const withLazyLoading = (
  componentLoader,
  options = {}
) => {
  const {
    loadingComponent: CustomLoadingComponent,
    errorComponent: CustomErrorComponent,
    priority = 'normal',
    preload = false,
    timeout = 10000,
    retryAttempts = 3,
    componentName = 'LazyComponent',
  } = options;

  return function LazyLoadedComponent(props) {
    const [Component, setComponent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const mountedRef = useRef(true);
    const loadStartTime = useRef(null);

    useEffect(() => {
      return () => {
        mountedRef.current = false;
      };
    }, []);

    useEffect(() => {
      if (preload) {
        loadComponent();
      }
    }, []);

    const loadComponent = async () => {
      if (!mountedRef.current) return;

      setLoading(true);
      setError(null);
      loadStartTime.current = Date.now();

      try {
        console.log(`Loading lazy component: ${componentName}`);

        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Component load timeout')), timeout);
        });

        // Load component with timeout
        const componentPromise = componentLoader();
        const loadedComponent = await Promise.race([componentPromise, timeoutPromise]);

        if (!mountedRef.current) return;

        // Handle different module formats
        const ComponentToRender = loadedComponent.default || loadedComponent;

        const loadTime = Date.now() - loadStartTime.current;
        
        // Track performance
        performanceOptimizationService.trackRenderTime(componentName, loadTime);

        setComponent(() => ComponentToRender);
        setLoading(false);
        
        console.log(`Lazy component loaded successfully: ${componentName} (${loadTime}ms)`);
      } catch (err) {
        console.error(`Error loading lazy component: ${componentName}`, err);
        
        if (!mountedRef.current) return;

        if (retryCount < retryAttempts) {
          console.log(`Retrying component load: ${componentName} (attempt ${retryCount + 1})`);
          setRetryCount(prev => prev + 1);
          
          // Exponential backoff for retries
          const retryDelay = Math.pow(2, retryCount) * 1000;
          setTimeout(() => {
            if (mountedRef.current) {
              loadComponent();
            }
          }, retryDelay);
        } else {
          setError(err);
          setLoading(false);
        }
      }
    };

    // Auto-load when component becomes visible (if not preloaded)
    useEffect(() => {
      if (!preload && !Component && !loading && !error) {
        loadComponent();
      }
    }, [preload, Component, loading, error]);

    // Render loading state
    if (loading) {
      if (CustomLoadingComponent) {
        return <CustomLoadingComponent />;
      }
      
      return (
        <View style={styles.loadingContainer}>
          <Card style={styles.loadingCard}>
            <Card.Content style={styles.loadingContent}>
              <ActivityIndicator 
                size="large" 
                color={theme.colors.primary} 
                style={styles.loadingIndicator}
              />
              <Text style={styles.loadingText}>
                Loading {componentName}...
              </Text>
              {retryCount > 0 && (
                <Text style={styles.retryText}>
                  Retry attempt {retryCount}/{retryAttempts}
                </Text>
              )}
            </Card.Content>
          </Card>
        </View>
      );
    }

    // Render error state
    if (error) {
      if (CustomErrorComponent) {
        return <CustomErrorComponent error={error} onRetry={loadComponent} />;
      }
      
      return (
        <View style={styles.errorContainer}>
          <Card style={styles.errorCard}>
            <Card.Content style={styles.errorContent}>
              <Text style={styles.errorTitle}>
                Failed to load {componentName}
              </Text>
              <Text style={styles.errorMessage}>
                {error.message || 'Unknown error occurred'}
              </Text>
              <Text 
                style={styles.retryButton}
                onPress={loadComponent}
              >
                Tap to retry
              </Text>
            </Card.Content>
          </Card>
        </View>
      );
    }

    // Render loaded component
    if (Component) {
      return <Component {...props} />;
    }

    return null;
  };
};

/**
 * Hook for lazy loading components with performance tracking
 */
export const useLazyComponent = (componentLoader, options = {}) => {
  const [Component, setComponent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadComponent = async () => {
    if (!mountedRef.current || loading) return;

    setLoading(true);
    setError(null);

    const startTime = Date.now();

    try {
      const loadedComponent = await componentLoader();
      
      if (!mountedRef.current) return;

      const ComponentToRender = loadedComponent.default || loadedComponent;
      const loadTime = Date.now() - startTime;

      // Track performance
      performanceOptimizationService.trackRenderTime(
        options.componentName || 'LazyHookComponent',
        loadTime
      );

      setComponent(() => ComponentToRender);
      setLoading(false);
    } catch (err) {
      console.error('Error loading component with hook:', err);
      
      if (!mountedRef.current) return;
      
      setError(err);
      setLoading(false);
    }
  };

  return {
    Component,
    loading,
    error,
    loadComponent,
  };
};

/**
 * Lazy loading wrapper for screen components
 */
export const LazyScreen = ({ 
  loader, 
  fallback, 
  errorFallback,
  screenName,
  ...props 
}) => {
  const LazyComponent = React.useMemo(
    () => withLazyLoading(loader, {
      loadingComponent: fallback,
      errorComponent: errorFallback,
      componentName: screenName,
      preload: true,
      priority: 'high',
    }),
    [loader, fallback, errorFallback, screenName]
  );

  return <LazyComponent {...props} />;
};

/**
 * Lazy loading wrapper for widget components
 */
export const LazyWidget = ({ 
  loader, 
  fallback, 
  widgetName,
  priority = 'normal',
  ...props 
}) => {
  const LazyComponent = React.useMemo(
    () => withLazyLoading(loader, {
      loadingComponent: fallback,
      componentName: widgetName,
      priority,
      preload: priority === 'high',
    }),
    [loader, fallback, widgetName, priority]
  );

  return <LazyComponent {...props} />;
};

/**
 * Batch lazy loader for multiple components
 */
export class BatchLazyLoader {
  constructor() {
    this.loadQueue = [];
    this.isProcessing = false;
    this.maxConcurrent = 3;
  }

  /**
   * Add component to lazy loading queue
   */
  addToQueue(componentId, loader, priority = 'normal') {
    this.loadQueue.push({
      componentId,
      loader,
      priority,
      timestamp: Date.now(),
    });

    // Sort by priority
    this.loadQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the lazy loading queue
   */
  async processQueue() {
    if (this.isProcessing || this.loadQueue.length === 0) return;

    this.isProcessing = true;
    console.log(`Processing lazy loading queue: ${this.loadQueue.length} items`);

    try {
      while (this.loadQueue.length > 0) {
        const batch = this.loadQueue.splice(0, this.maxConcurrent);
        
        const loadPromises = batch.map(async (item) => {
          try {
            const startTime = Date.now();
            await performanceOptimizationService.loadLazyComponent(item.componentId);
            const loadTime = Date.now() - startTime;
            
            console.log(`Batch loaded: ${item.componentId} (${loadTime}ms)`);
            return { success: true, componentId: item.componentId, loadTime };
          } catch (error) {
            console.error(`Batch load failed: ${item.componentId}`, error);
            return { success: false, componentId: item.componentId, error };
          }
        });

        await Promise.allSettled(loadPromises);

        // Small delay between batches to avoid overwhelming the system
        if (this.loadQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } finally {
      this.isProcessing = false;
      console.log('Lazy loading queue processing completed');
    }
  }

  /**
   * Clear the loading queue
   */
  clearQueue() {
    this.loadQueue = [];
    console.log('Lazy loading queue cleared');
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.loadQueue.length,
      isProcessing: this.isProcessing,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

// Create global batch loader instance
export const batchLazyLoader = new BatchLazyLoader();

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingCard: {
    backgroundColor: theme.colors.surface,
    minWidth: 200,
  },
  loadingContent: {
    alignItems: 'center',
    padding: 16,
  },
  loadingIndicator: {
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  retryText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorCard: {
    backgroundColor: theme.colors.errorContainer,
    minWidth: 250,
  },
  errorContent: {
    alignItems: 'center',
    padding: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onErrorContainer,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: theme.colors.onErrorContainer,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

export default withLazyLoading;