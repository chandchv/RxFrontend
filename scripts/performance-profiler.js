#!/usr/bin/env node

/**
 * Performance Profiler Script
 * Real-time performance monitoring and profiling for React Native app
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class PerformanceProfiler extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      sampleInterval: options.sampleInterval || 100, // ms
      maxSamples: options.maxSamples || 10000,
      outputDir: options.outputDir || path.join(__dirname, '../performance-profiles'),
      enableMemoryProfiling: options.enableMemoryProfiling !== false,
      enableCPUProfiling: options.enableCPUProfiling !== false,
      enableNetworkProfiling: options.enableNetworkProfiling !== false,
      ...options,
    };
    
    this.isRunning = false;
    this.startTime = null;
    this.samples = [];
    this.events = [];
    this.intervals = [];
    
    this.metrics = {
      memory: [],
      cpu: [],
      network: [],
      renders: [],
      navigations: [],
      interactions: [],
    };
    
    this.setupOutputDirectory();
  }

  setupOutputDirectory() {
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️  Profiler is already running');
      return;
    }

    console.log('🚀 Starting Performance Profiler...');
    
    this.isRunning = true;
    this.startTime = Date.now();
    this.samples = [];
    this.events = [];
    
    // Start profiling intervals
    if (this.options.enableMemoryProfiling) {
      this.startMemoryProfiling();
    }
    
    if (this.options.enableCPUProfiling) {
      this.startCPUProfiling();
    }
    
    if (this.options.enableNetworkProfiling) {
      this.startNetworkProfiling();
    }
    
    // Setup event listeners
    this.setupEventListeners();
    
    console.log('✅ Profiler started successfully');
    console.log(`📊 Sampling every ${this.options.sampleInterval}ms`);
    console.log(`💾 Output directory: ${this.options.outputDir}`);
    
    this.emit('started');
  }

  stop() {
    if (!this.isRunning) {
      console.log('⚠️  Profiler is not running');
      return;
    }

    console.log('🛑 Stopping Performance Profiler...');
    
    this.isRunning = false;
    
    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    
    // Generate and save report
    const report = this.generateReport();
    this.saveReport(report);
    
    console.log('✅ Profiler stopped successfully');
    console.log(`📄 Report saved with ${this.samples.length} samples`);
    
    this.emit('stopped', report);
    
    return report;
  }

  startMemoryProfiling() {
    console.log('💾 Starting memory profiling...');
    
    const memoryInterval = setInterval(() => {
      if (!this.isRunning) return;
      
      const memory = process.memoryUsage();
      const timestamp = Date.now() - this.startTime;
      
      const memorySample = {
        timestamp,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
        rss: memory.rss,
        arrayBuffers: memory.arrayBuffers || 0,
      };
      
      this.metrics.memory.push(memorySample);
      
      // Detect memory leaks
      if (this.metrics.memory.length > 100) {
        this.detectMemoryLeaks();
      }
      
      // Limit samples
      if (this.metrics.memory.length > this.options.maxSamples) {
        this.metrics.memory.shift();
      }
      
    }, this.options.sampleInterval);
    
    this.intervals.push(memoryInterval);
  }

  startCPUProfiling() {
    console.log('⚡ Starting CPU profiling...');
    
    let lastCpuUsage = process.cpuUsage();
    
    const cpuInterval = setInterval(() => {
      if (!this.isRunning) return;
      
      const currentCpuUsage = process.cpuUsage(lastCpuUsage);
      const timestamp = Date.now() - this.startTime;
      
      const cpuSample = {
        timestamp,
        user: currentCpuUsage.user,
        system: currentCpuUsage.system,
        userPercent: (currentCpuUsage.user / (this.options.sampleInterval * 1000)) * 100,
        systemPercent: (currentCpuUsage.system / (this.options.sampleInterval * 1000)) * 100,
      };
      
      this.metrics.cpu.push(cpuSample);
      
      // Detect CPU spikes
      if (cpuSample.userPercent > 80) {
        this.recordEvent('cpu_spike', {
          userPercent: cpuSample.userPercent,
          systemPercent: cpuSample.systemPercent,
        });
      }
      
      lastCpuUsage = process.cpuUsage();
      
      // Limit samples
      if (this.metrics.cpu.length > this.options.maxSamples) {
        this.metrics.cpu.shift();
      }
      
    }, this.options.sampleInterval);
    
    this.intervals.push(cpuInterval);
  }

  startNetworkProfiling() {
    console.log('🌐 Starting network profiling...');
    
    // Mock network profiling (in real app, this would hook into fetch/XMLHttpRequest)
    this.networkRequests = new Map();
    
    // Simulate network monitoring
    const networkInterval = setInterval(() => {
      if (!this.isRunning) return;
      
      // In a real implementation, this would collect actual network metrics
      const networkSample = {
        timestamp: Date.now() - this.startTime,
        activeRequests: this.networkRequests.size,
        totalRequests: this.metrics.network.length,
        averageResponseTime: this.calculateAverageResponseTime(),
      };
      
      this.metrics.network.push(networkSample);
      
      // Limit samples
      if (this.metrics.network.length > this.options.maxSamples) {
        this.metrics.network.shift();
      }
      
    }, this.options.sampleInterval * 5); // Less frequent sampling for network
    
    this.intervals.push(networkInterval);
  }

  setupEventListeners() {
    // Listen for custom performance events
    process.on('performance:render', (data) => {
      this.recordRenderEvent(data);
    });
    
    process.on('performance:navigation', (data) => {
      this.recordNavigationEvent(data);
    });
    
    process.on('performance:interaction', (data) => {
      this.recordInteractionEvent(data);
    });
  }

  recordEvent(type, data) {
    const event = {
      type,
      timestamp: Date.now() - this.startTime,
      data,
    };
    
    this.events.push(event);
    
    // Emit event for real-time monitoring
    this.emit('event', event);
  }

  recordRenderEvent(data) {
    const renderEvent = {
      timestamp: Date.now() - this.startTime,
      component: data.component,
      renderTime: data.renderTime,
      props: data.props ? Object.keys(data.props).length : 0,
      children: data.children || 0,
    };
    
    this.metrics.renders.push(renderEvent);
    
    // Detect slow renders
    if (data.renderTime > 100) {
      this.recordEvent('slow_render', {
        component: data.component,
        renderTime: data.renderTime,
      });
    }
    
    // Limit samples
    if (this.metrics.renders.length > this.options.maxSamples) {
      this.metrics.renders.shift();
    }
  }

  recordNavigationEvent(data) {
    const navigationEvent = {
      timestamp: Date.now() - this.startTime,
      from: data.from,
      to: data.to,
      navigationTime: data.navigationTime,
      method: data.method || 'navigate',
    };
    
    this.metrics.navigations.push(navigationEvent);
    
    // Detect slow navigation
    if (data.navigationTime > 300) {
      this.recordEvent('slow_navigation', {
        from: data.from,
        to: data.to,
        navigationTime: data.navigationTime,
      });
    }
    
    // Limit samples
    if (this.metrics.navigations.length > this.options.maxSamples) {
      this.metrics.navigations.shift();
    }
  }

  recordInteractionEvent(data) {
    const interactionEvent = {
      timestamp: Date.now() - this.startTime,
      type: data.type,
      target: data.target,
      responseTime: data.responseTime,
      x: data.x,
      y: data.y,
    };
    
    this.metrics.interactions.push(interactionEvent);
    
    // Detect slow interactions
    if (data.responseTime > 200) {
      this.recordEvent('slow_interaction', {
        type: data.type,
        target: data.target,
        responseTime: data.responseTime,
      });
    }
    
    // Limit samples
    if (this.metrics.interactions.length > this.options.maxSamples) {
      this.metrics.interactions.shift();
    }
  }

  detectMemoryLeaks() {
    const recentSamples = this.metrics.memory.slice(-50); // Last 50 samples
    
    if (recentSamples.length < 50) return;
    
    // Check for consistent memory growth
    const firstSample = recentSamples[0];
    const lastSample = recentSamples[recentSamples.length - 1];
    
    const memoryGrowth = lastSample.heapUsed - firstSample.heapUsed;
    const timeSpan = lastSample.timestamp - firstSample.timestamp;
    
    // If memory grew by more than 10MB in the last 5 seconds
    if (memoryGrowth > 10 * 1024 * 1024 && timeSpan < 5000) {
      this.recordEvent('potential_memory_leak', {
        memoryGrowth,
        timeSpan,
        growthRate: memoryGrowth / timeSpan, // bytes per ms
      });
    }
  }

  calculateAverageResponseTime() {
    const recentNetworkSamples = this.metrics.network.slice(-10);
    
    if (recentNetworkSamples.length === 0) return 0;
    
    // This would calculate actual response times in a real implementation
    return 250 + Math.random() * 500; // Mock average response time
  }

  generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    const report = {
      metadata: {
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration,
        sampleInterval: this.options.sampleInterval,
        totalSamples: this.samples.length,
        totalEvents: this.events.length,
      },
      
      summary: this.generateSummary(),
      
      metrics: {
        memory: this.analyzeMemoryMetrics(),
        cpu: this.analyzeCPUMetrics(),
        network: this.analyzeNetworkMetrics(),
        renders: this.analyzeRenderMetrics(),
        navigations: this.analyzeNavigationMetrics(),
        interactions: this.analyzeInteractionMetrics(),
      },
      
      events: this.categorizeEvents(),
      
      recommendations: this.generateRecommendations(),
      
      rawData: {
        memory: this.metrics.memory,
        cpu: this.metrics.cpu,
        network: this.metrics.network,
        renders: this.metrics.renders,
        navigations: this.metrics.navigations,
        interactions: this.metrics.interactions,
        events: this.events,
      },
    };
    
    return report;
  }

  generateSummary() {
    return {
      memoryPeak: this.metrics.memory.length > 0 ? 
        Math.max(...this.metrics.memory.map(m => m.heapUsed)) : 0,
      
      averageCPU: this.metrics.cpu.length > 0 ?
        this.metrics.cpu.reduce((sum, c) => sum + c.userPercent, 0) / this.metrics.cpu.length : 0,
      
      totalRenders: this.metrics.renders.length,
      
      averageRenderTime: this.metrics.renders.length > 0 ?
        this.metrics.renders.reduce((sum, r) => sum + r.renderTime, 0) / this.metrics.renders.length : 0,
      
      totalNavigations: this.metrics.navigations.length,
      
      averageNavigationTime: this.metrics.navigations.length > 0 ?
        this.metrics.navigations.reduce((sum, n) => sum + n.navigationTime, 0) / this.metrics.navigations.length : 0,
      
      totalInteractions: this.metrics.interactions.length,
      
      criticalEvents: this.events.filter(e => 
        ['slow_render', 'slow_navigation', 'potential_memory_leak', 'cpu_spike'].includes(e.type)
      ).length,
    };
  }

  analyzeMemoryMetrics() {
    if (this.metrics.memory.length === 0) return null;
    
    const heapUsages = this.metrics.memory.map(m => m.heapUsed);
    
    return {
      samples: this.metrics.memory.length,
      peak: Math.max(...heapUsages),
      average: heapUsages.reduce((sum, h) => sum + h, 0) / heapUsages.length,
      min: Math.min(...heapUsages),
      growth: heapUsages[heapUsages.length - 1] - heapUsages[0],
      trend: this.calculateTrend(heapUsages),
    };
  }

  analyzeCPUMetrics() {
    if (this.metrics.cpu.length === 0) return null;
    
    const userPercents = this.metrics.cpu.map(c => c.userPercent);
    
    return {
      samples: this.metrics.cpu.length,
      peak: Math.max(...userPercents),
      average: userPercents.reduce((sum, u) => sum + u, 0) / userPercents.length,
      min: Math.min(...userPercents),
      spikes: this.metrics.cpu.filter(c => c.userPercent > 80).length,
    };
  }

  analyzeNetworkMetrics() {
    if (this.metrics.network.length === 0) return null;
    
    return {
      samples: this.metrics.network.length,
      totalRequests: this.metrics.network[this.metrics.network.length - 1]?.totalRequests || 0,
      averageResponseTime: this.calculateAverageResponseTime(),
    };
  }

  analyzeRenderMetrics() {
    if (this.metrics.renders.length === 0) return null;
    
    const renderTimes = this.metrics.renders.map(r => r.renderTime);
    const components = [...new Set(this.metrics.renders.map(r => r.component))];
    
    return {
      totalRenders: this.metrics.renders.length,
      uniqueComponents: components.length,
      averageRenderTime: renderTimes.reduce((sum, t) => sum + t, 0) / renderTimes.length,
      slowRenders: this.metrics.renders.filter(r => r.renderTime > 100).length,
      componentBreakdown: this.getComponentRenderBreakdown(),
    };
  }

  analyzeNavigationMetrics() {
    if (this.metrics.navigations.length === 0) return null;
    
    const navigationTimes = this.metrics.navigations.map(n => n.navigationTime);
    
    return {
      totalNavigations: this.metrics.navigations.length,
      averageNavigationTime: navigationTimes.reduce((sum, t) => sum + t, 0) / navigationTimes.length,
      slowNavigations: this.metrics.navigations.filter(n => n.navigationTime > 300).length,
      routeBreakdown: this.getRouteNavigationBreakdown(),
    };
  }

  analyzeInteractionMetrics() {
    if (this.metrics.interactions.length === 0) return null;
    
    const responseTimes = this.metrics.interactions.map(i => i.responseTime);
    
    return {
      totalInteractions: this.metrics.interactions.length,
      averageResponseTime: responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length,
      slowInteractions: this.metrics.interactions.filter(i => i.responseTime > 200).length,
      interactionTypes: this.getInteractionTypeBreakdown(),
    };
  }

  categorizeEvents() {
    const categories = {};
    
    this.events.forEach(event => {
      if (!categories[event.type]) {
        categories[event.type] = [];
      }
      categories[event.type].push(event);
    });
    
    return categories;
  }

  generateRecommendations() {
    const recommendations = [];
    const summary = this.generateSummary();
    
    // Memory recommendations
    if (summary.memoryPeak > 100 * 1024 * 1024) { // 100MB
      recommendations.push({
        category: 'memory',
        priority: 'high',
        issue: 'High memory usage detected',
        suggestion: 'Consider implementing memory optimization strategies',
      });
    }
    
    // CPU recommendations
    if (summary.averageCPU > 50) {
      recommendations.push({
        category: 'cpu',
        priority: 'medium',
        issue: 'High CPU usage detected',
        suggestion: 'Optimize expensive operations and consider using web workers',
      });
    }
    
    // Render recommendations
    if (summary.averageRenderTime > 50) {
      recommendations.push({
        category: 'rendering',
        priority: 'medium',
        issue: 'Slow rendering detected',
        suggestion: 'Optimize component rendering and consider memoization',
      });
    }
    
    // Navigation recommendations
    if (summary.averageNavigationTime > 200) {
      recommendations.push({
        category: 'navigation',
        priority: 'medium',
        issue: 'Slow navigation detected',
        suggestion: 'Implement lazy loading and optimize screen transitions',
      });
    }
    
    return recommendations;
  }

  getComponentRenderBreakdown() {
    const breakdown = {};
    
    this.metrics.renders.forEach(render => {
      if (!breakdown[render.component]) {
        breakdown[render.component] = {
          count: 0,
          totalTime: 0,
          averageTime: 0,
        };
      }
      
      breakdown[render.component].count++;
      breakdown[render.component].totalTime += render.renderTime;
      breakdown[render.component].averageTime = 
        breakdown[render.component].totalTime / breakdown[render.component].count;
    });
    
    return breakdown;
  }

  getRouteNavigationBreakdown() {
    const breakdown = {};
    
    this.metrics.navigations.forEach(nav => {
      const route = `${nav.from} -> ${nav.to}`;
      
      if (!breakdown[route]) {
        breakdown[route] = {
          count: 0,
          totalTime: 0,
          averageTime: 0,
        };
      }
      
      breakdown[route].count++;
      breakdown[route].totalTime += nav.navigationTime;
      breakdown[route].averageTime = 
        breakdown[route].totalTime / breakdown[route].count;
    });
    
    return breakdown;
  }

  getInteractionTypeBreakdown() {
    const breakdown = {};
    
    this.metrics.interactions.forEach(interaction => {
      if (!breakdown[interaction.type]) {
        breakdown[interaction.type] = {
          count: 0,
          totalTime: 0,
          averageTime: 0,
        };
      }
      
      breakdown[interaction.type].count++;
      breakdown[interaction.type].totalTime += interaction.responseTime;
      breakdown[interaction.type].averageTime = 
        breakdown[interaction.type].totalTime / breakdown[interaction.type].count;
    });
    
    return breakdown;
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  saveReport(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `profile-${timestamp}.json`;
    const filepath = path.join(this.options.outputDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    
    // Also save a summary report
    const summaryFilename = `profile-summary-${timestamp}.json`;
    const summaryFilepath = path.join(this.options.outputDir, summaryFilename);
    
    const summaryReport = {
      metadata: report.metadata,
      summary: report.summary,
      recommendations: report.recommendations,
    };
    
    fs.writeFileSync(summaryFilepath, JSON.stringify(summaryReport, null, 2));
    
    console.log(`📄 Full report: ${filepath}`);
    console.log(`📋 Summary: ${summaryFilepath}`);
  }

  // Static methods for easy integration
  static trackRender(component, renderTime, props, children) {
    process.emit('performance:render', {
      component,
      renderTime,
      props,
      children,
    });
  }

  static trackNavigation(from, to, navigationTime, method) {
    process.emit('performance:navigation', {
      from,
      to,
      navigationTime,
      method,
    });
  }

  static trackInteraction(type, target, responseTime, x, y) {
    process.emit('performance:interaction', {
      type,
      target,
      responseTime,
      x,
      y,
    });
  }
}

// CLI interface
if (require.main === module) {
  const profiler = new PerformanceProfiler();
  
  console.log('🎯 Performance Profiler CLI');
  console.log('Commands: start, stop, status');
  
  const command = process.argv[2];
  
  switch (command) {
    case 'start':
      profiler.start();
      
      // Run for specified duration or until interrupted
      const duration = parseInt(process.argv[3]) || 60000; // Default 60 seconds
      
      setTimeout(() => {
        profiler.stop();
        process.exit(0);
      }, duration);
      
      break;
      
    case 'stop':
      console.log('Use Ctrl+C to stop the profiler');
      break;
      
    case 'status':
      console.log('Profiler status: Not implemented in CLI mode');
      break;
      
    default:
      console.log('Usage: node performance-profiler.js [start|stop|status] [duration_ms]');
      process.exit(1);
  }
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received interrupt signal');
    if (profiler.isRunning) {
      profiler.stop();
    }
    process.exit(0);
  });
}

module.exports = PerformanceProfiler;