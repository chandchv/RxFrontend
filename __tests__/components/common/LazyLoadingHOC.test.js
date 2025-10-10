import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import withLazyLoading, { 
  useLazyComponent, 
  LazyScreen, 
  LazyWidget, 
  BatchLazyLoader,
  batchLazyLoader 
} from '../../../components/common/LazyLoadingHOC';
import performanceOptimizationService from '../../../services/performanceOptimizationService';

// Mock dependencies
jest.mock('../../../services/performanceOptimizationService');
jest.mock('react-native-paper', () => ({
  Card: ({ children, style }) => <View style={style}>{children}</View>,
  ActivityIndicator: ({ size, color, style }) => <View style={style} testID="loading-indicator" />,
}));

describe('LazyLoadingHOC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('withLazyLoading', () => {
    test('should render loading state initially', async () => {
      const TestComponent = () => <Text>Test Component</Text>;
      const componentLoader = jest.fn().mockResolvedValue({ default: TestComponent });
      const LazyComponent = withLazyLoading(componentLoader, {
        componentName: 'TestComponent',
        preload: true,
      });

      const { getByTestId, getByText } = render(<LazyComponent />);

      expect(getByTestId('loading-indicator')).toBeTruthy();
      expect(getByText('Loading TestComponent...')).toBeTruthy();
    });

    test('should render component after successful loading', async () => {
      const TestComponent = () => <Text>Test Component Loaded</Text>;
      const componentLoader = jest.fn().mockResolvedValue({ default: TestComponent });
      const LazyComponent = withLazyLoading(componentLoader, {
        componentName: 'TestComponent',
        preload: true,
      });

      const { getByText, queryByTestId } = render(<LazyComponent />);

      await waitFor(() => {
        expect(queryByTestId('loading-indicator')).toBeNull();
        expect(getByText('Test Component Loaded')).toBeTruthy();
      });

      expect(componentLoader).toHaveBeenCalled();
      expect(performanceOptimizationService.trackRenderTime).toHaveBeenCalledWith(
        'TestComponent',
        expect.any(Number)
      );
    });

    test('should handle component without default export', async () => {
      const TestComponent = () => <Text>Direct Export Component</Text>;
      const componentLoader = jest.fn().mockResolvedValue(TestComponent);
      const LazyComponent = withLazyLoading(componentLoader, {
        componentName: 'TestComponent',
        preload: true,
      });

      const { getByText } = render(<LazyComponent />);

      await waitFor(() => {
        expect(getByText('Direct Export Component')).toBeTruthy();
      });
    });

    test('should render error state on loading failure', async () => {
      const error = new Error('Component load failed');
      const componentLoader = jest.fn().mockRejectedValue(error);
      const LazyComponent = withLazyLoading(componentLoader, {
        componentName: 'TestComponent',
        preload: true,
        retryAttempts: 0, // Disable retries for this test
      });

      const { getByText } = render(<LazyComponent />);

      await waitFor(() => {
        expect(getByText('Failed to load TestComponent')).toBeTruthy();
        expect(getByText('Component load failed')).toBeTruthy();
        expect(getByText('Tap to retry')).toBeTruthy();
      });
    });

    test('should retry loading on failure', async () => {
      const TestComponent = () => <Text>Test Component</Text>;
      const componentLoader = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce({ default: TestComponent });

      const LazyComponent = withLazyLoading(componentLoader, {
        componentName: 'TestComponent',
        preload: true,
        retryAttempts: 2,
      });

      const { getByText } = render(<LazyComponent />);

      // Wait for first failure and retry
      await waitFor(() => {
        expect(getByText('Retry attempt 1/2')).toBeTruthy();
      });

      // Fast-forward retry delay
      jest.advanceTimersByTime(1000);

      // Wait for successful load
      await waitFor(() => {
        expect(getByText('Test Component')).toBeTruthy();
      });

      expect(componentLoader).toHaveBeenCalledTimes(2);
    });

    test('should handle timeout during loading', async () => {
      const componentLoader = jest.fn().mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const LazyComponent = withLazyLoading(componentLoader, {
        componentName: 'TestComponent',
        preload: true,
        timeout: 1000,
        retryAttempts: 0,
      });

      const { getByText } = render(<LazyComponent />);

      // Fast-forward past timeout
      jest.advanceTimersByTime(1100);

      await waitFor(() => {
        expect(getByText('Failed to load TestComponent')).toBeTruthy();
        expect(getByText('Component load timeout')).toBeTruthy();
      });
    });

    test('should use custom loading component', () => {
      const CustomLoadingComponent = () => <Text>Custom Loading...</Text>;
      const componentLoader = jest.fn().mockResolvedValue({ default: () => null });
      const LazyComponent = withLazyLoading(componentLoader, {
        loadingComponent: CustomLoadingComponent,
        preload: true,
      });

      const { getByText } = render(<LazyComponent />);

      expect(getByText('Custom Loading...')).toBeTruthy();
    });

    test('should use custom error component', async () => {
      const CustomErrorComponent = ({ error, onRetry }) => (
        <View>
          <Text>Custom Error: {error.message}</Text>
          <Text onPress={onRetry}>Custom Retry</Text>
        </View>
      );

      const componentLoader = jest.fn().mockRejectedValue(new Error('Custom error'));
      const LazyComponent = withLazyLoading(componentLoader, {
        errorComponent: CustomErrorComponent,
        preload: true,
        retryAttempts: 0,
      });

      const { getByText } = render(<LazyComponent />);

      await waitFor(() => {
        expect(getByText('Custom Error: Custom error')).toBeTruthy();
        expect(getByText('Custom Retry')).toBeTruthy();
      });
    });

    test('should handle manual retry', async () => {
      const TestComponent = () => <Text>Test Component</Text>;
      const componentLoader = jest.fn()
        .mockRejectedValueOnce(new Error('Load failed'))
        .mockResolvedValueOnce({ default: TestComponent });

      const LazyComponent = withLazyLoading(componentLoader, {
        componentName: 'TestComponent',
        preload: true,
        retryAttempts: 0,
      });

      const { getByText } = render(<LazyComponent />);

      // Wait for error state
      await waitFor(() => {
        expect(getByText('Failed to load TestComponent')).toBeTruthy();
      });

      // Tap retry button
      fireEvent.press(getByText('Tap to retry'));

      // Wait for successful load
      await waitFor(() => {
        expect(getByText('Test Component')).toBeTruthy();
      });

      expect(componentLoader).toHaveBeenCalledTimes(2);
    });

    test('should not load if not preloaded and not triggered', () => {
      const componentLoader = jest.fn().mockResolvedValue({ default: () => null });
      const LazyComponent = withLazyLoading(componentLoader, {
        preload: false,
      });

      render(<LazyComponent />);

      expect(componentLoader).not.toHaveBeenCalled();
    });

    test('should pass props to loaded component', async () => {
      const TestComponent = ({ testProp }) => <Text>Prop: {testProp}</Text>;
      const componentLoader = jest.fn().mockResolvedValue({ default: TestComponent });
      const LazyComponent = withLazyLoading(componentLoader, {
        preload: true,
      });

      const { getByText } = render(<LazyComponent testProp="test value" />);

      await waitFor(() => {
        expect(getByText('Prop: test value')).toBeTruthy();
      });
    });
  });

  describe('useLazyComponent', () => {
    test('should load component with hook', async () => {
      const TestComponent = () => <Text>Hook Component</Text>;
      const componentLoader = jest.fn().mockResolvedValue({ default: TestComponent });

      const TestWrapper = () => {
        const { Component, loading, error, loadComponent } = useLazyComponent(componentLoader, {
          componentName: 'HookComponent',
        });

        React.useEffect(() => {
          loadComponent();
        }, []);

        if (loading) return <Text>Loading...</Text>;
        if (error) return <Text>Error: {error.message}</Text>;
        if (Component) return <Component />;
        return <Text>No component</Text>;
      };

      const { getByText } = render(<TestWrapper />);

      expect(getByText('Loading...')).toBeTruthy();

      await waitFor(() => {
        expect(getByText('Hook Component')).toBeTruthy();
      });

      expect(performanceOptimizationService.trackRenderTime).toHaveBeenCalledWith(
        'HookComponent',
        expect.any(Number)
      );
    });

    test('should handle hook loading error', async () => {
      const error = new Error('Hook load failed');
      const componentLoader = jest.fn().mockRejectedValue(error);

      const TestWrapper = () => {
        const { Component, loading, error: loadError, loadComponent } = useLazyComponent(componentLoader);

        React.useEffect(() => {
          loadComponent();
        }, []);

        if (loading) return <Text>Loading...</Text>;
        if (loadError) return <Text>Error: {loadError.message}</Text>;
        if (Component) return <Component />;
        return <Text>No component</Text>;
      };

      const { getByText } = render(<TestWrapper />);

      await waitFor(() => {
        expect(getByText('Error: Hook load failed')).toBeTruthy();
      });
    });

    test('should not load if already loading', async () => {
      const componentLoader = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      const TestWrapper = () => {
        const { loading, loadComponent } = useLazyComponent(componentLoader);

        React.useEffect(() => {
          loadComponent();
          loadComponent(); // Second call should be ignored
        }, []);

        return <Text>{loading ? 'Loading...' : 'Not loading'}</Text>;
      };

      render(<TestWrapper />);

      expect(componentLoader).toHaveBeenCalledTimes(1);
    });
  });

  describe('LazyScreen', () => {
    test('should render lazy screen with high priority', async () => {
      const ScreenComponent = () => <Text>Screen Component</Text>;
      const loader = jest.fn().mockResolvedValue({ default: ScreenComponent });

      const { getByText } = render(
        <LazyScreen
          loader={loader}
          screenName="TestScreen"
          testProp="screen prop"
        />
      );

      await waitFor(() => {
        expect(getByText('Screen Component')).toBeTruthy();
      });

      expect(loader).toHaveBeenCalled();
    });

    test('should use custom fallback for screen', () => {
      const CustomFallback = () => <Text>Screen Loading...</Text>;
      const loader = jest.fn().mockResolvedValue({ default: () => null });

      const { getByText } = render(
        <LazyScreen
          loader={loader}
          fallback={CustomFallback}
          screenName="TestScreen"
        />
      );

      expect(getByText('Screen Loading...')).toBeTruthy();
    });
  });

  describe('LazyWidget', () => {
    test('should render lazy widget with normal priority', async () => {
      const WidgetComponent = () => <Text>Widget Component</Text>;
      const loader = jest.fn().mockResolvedValue({ default: WidgetComponent });

      const { getByText } = render(
        <LazyWidget
          loader={loader}
          widgetName="TestWidget"
          priority="normal"
        />
      );

      await waitFor(() => {
        expect(getByText('Widget Component')).toBeTruthy();
      });
    });

    test('should preload high priority widgets', () => {
      const loader = jest.fn().mockResolvedValue({ default: () => null });

      render(
        <LazyWidget
          loader={loader}
          widgetName="HighPriorityWidget"
          priority="high"
        />
      );

      expect(loader).toHaveBeenCalled();
    });

    test('should not preload low priority widgets', () => {
      const loader = jest.fn().mockResolvedValue({ default: () => null });

      render(
        <LazyWidget
          loader={loader}
          widgetName="LowPriorityWidget"
          priority="low"
        />
      );

      expect(loader).not.toHaveBeenCalled();
    });
  });

  describe('BatchLazyLoader', () => {
    let batchLoader;

    beforeEach(() => {
      batchLoader = new BatchLazyLoader();
      performanceOptimizationService.loadLazyComponent.mockResolvedValue();
    });

    test('should add components to queue', () => {
      const loader = jest.fn();
      
      batchLoader.addToQueue('comp1', loader, 'high');
      batchLoader.addToQueue('comp2', loader, 'normal');

      expect(batchLoader.loadQueue).toHaveLength(2);
      expect(batchLoader.loadQueue[0].priority).toBe('high'); // Should be first due to priority
      expect(batchLoader.loadQueue[1].priority).toBe('normal');
    });

    test('should sort queue by priority', () => {
      const loader = jest.fn();
      
      batchLoader.addToQueue('comp1', loader, 'low');
      batchLoader.addToQueue('comp2', loader, 'high');
      batchLoader.addToQueue('comp3', loader, 'normal');

      expect(batchLoader.loadQueue[0].priority).toBe('high');
      expect(batchLoader.loadQueue[1].priority).toBe('normal');
      expect(batchLoader.loadQueue[2].priority).toBe('low');
    });

    test('should process queue in batches', async () => {
      const loader = jest.fn();
      batchLoader.maxConcurrent = 2;
      
      batchLoader.addToQueue('comp1', loader, 'normal');
      batchLoader.addToQueue('comp2', loader, 'normal');
      batchLoader.addToQueue('comp3', loader, 'normal');

      await batchLoader.processQueue();

      expect(performanceOptimizationService.loadLazyComponent).toHaveBeenCalledTimes(3);
      expect(batchLoader.loadQueue).toHaveLength(0);
    });

    test('should handle loading errors in batch', async () => {
      const loader = jest.fn();
      performanceOptimizationService.loadLazyComponent
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Load failed'));
      
      batchLoader.addToQueue('comp1', loader, 'normal');
      batchLoader.addToQueue('comp2', loader, 'normal');

      await batchLoader.processQueue();

      expect(performanceOptimizationService.loadLazyComponent).toHaveBeenCalledTimes(2);
      expect(batchLoader.loadQueue).toHaveLength(0);
    });

    test('should clear queue', () => {
      const loader = jest.fn();
      
      batchLoader.addToQueue('comp1', loader, 'normal');
      batchLoader.addToQueue('comp2', loader, 'normal');

      expect(batchLoader.loadQueue).toHaveLength(2);

      batchLoader.clearQueue();

      expect(batchLoader.loadQueue).toHaveLength(0);
    });

    test('should get queue status', () => {
      const loader = jest.fn();
      
      batchLoader.addToQueue('comp1', loader, 'normal');
      batchLoader.isProcessing = true;

      const status = batchLoader.getQueueStatus();

      expect(status).toEqual({
        queueLength: 1,
        isProcessing: true,
        maxConcurrent: 3,
      });
    });

    test('should not process queue if already processing', async () => {
      const loader = jest.fn();
      batchLoader.isProcessing = true;
      
      batchLoader.addToQueue('comp1', loader, 'normal');

      await batchLoader.processQueue();

      expect(performanceOptimizationService.loadLazyComponent).not.toHaveBeenCalled();
    });
  });

  describe('Global batch loader', () => {
    test('should use global batch loader instance', () => {
      expect(batchLazyLoader).toBeInstanceOf(BatchLazyLoader);
    });
  });

  describe('Component unmounting', () => {
    test('should handle component unmounting during load', async () => {
      const TestComponent = () => <Text>Test Component</Text>;
      const componentLoader = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ default: TestComponent }), 100))
      );

      const LazyComponent = withLazyLoading(componentLoader, {
        preload: true,
      });

      const { unmount } = render(<LazyComponent />);

      // Unmount before load completes
      unmount();

      // Fast-forward time
      jest.advanceTimersByTime(200);

      // Should not cause any errors
      expect(componentLoader).toHaveBeenCalled();
    });
  });

  describe('Error boundaries', () => {
    test('should handle errors in component loading gracefully', async () => {
      const componentLoader = jest.fn().mockRejectedValue(new Error('Network error'));
      const LazyComponent = withLazyLoading(componentLoader, {
        componentName: 'TestComponent',
        preload: true,
        retryAttempts: 0,
      });

      const { getByText } = render(<LazyComponent />);

      await waitFor(() => {
        expect(getByText('Failed to load TestComponent')).toBeTruthy();
        expect(getByText('Network error')).toBeTruthy();
      });
    });
  });
});