import { Image } from 'react-native';
import offlineStorageService from './offlineStorageService';

/**
 * Image Caching Service
 * Handles intelligent caching of images and documents for offline access
 */
class ImageCachingService {
  constructor() {
    this.downloadQueue = [];
    this.isProcessingQueue = false;
    this.maxCacheSize = 100 * 1024 * 1024; // 100MB
    this.maxImageSize = 5 * 1024 * 1024; // 5MB per image
    this.supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
    this.compressionQuality = 0.8;
  }

  /**
   * Get cached image or download and cache it
   */
  async getCachedImage(imageUrl, options = {}) {
    if (!imageUrl) return null;
    
    try {
      // Check if image is already cached
      const cachedImage = await offlineStorageService.getCachedImage(imageUrl);
      
      if (cachedImage && !options.forceRefresh) {
        console.log(`Image cache hit: ${imageUrl}`);
        return cachedImage;
      }
      
      console.log(`Image cache miss: ${imageUrl}`);
      
      // Download and cache the image
      const imageData = await this.downloadAndCacheImage(imageUrl, options);
      return imageData;
    } catch (error) {
      console.error(`Error getting cached image: ${imageUrl}`, error);
      
      // Try to return cached version as fallback
      const fallbackImage = await offlineStorageService.getCachedImage(imageUrl);
      return fallbackImage;
    }
  }

  /**
   * Download and cache image
   */
  async downloadAndCacheImage(imageUrl, options = {}) {
    try {
      // Check if URL is valid and supported
      if (!this.isValidImageUrl(imageUrl)) {
        throw new Error(`Unsupported image format: ${imageUrl}`);
      }
      
      // Check cache size before downloading
      await this.manageCacheSize();
      
      console.log(`Downloading image: ${imageUrl}`);
      
      // Download image
      const response = await fetch(imageUrl, {
        method: 'GET',
        headers: {
          'Accept': 'image/*',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Check content size
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > this.maxImageSize) {
        throw new Error(`Image too large: ${contentLength} bytes`);
      }
      
      // Get image data
      const blob = await response.blob();
      const imageData = await this.blobToBase64(blob);
      
      // Compress if needed
      const compressedData = await this.compressImageIfNeeded(imageData, options);
      
      // Cache the image
      await offlineStorageService.cacheImage(imageUrl, compressedData);
      
      console.log(`Image cached successfully: ${imageUrl}`);
      return compressedData;
    } catch (error) {
      console.error(`Error downloading image: ${imageUrl}`, error);
      throw error;
    }
  }

  /**
   * Queue image for background download
   */
  queueImageDownload(imageUrl, options = {}) {
    if (!imageUrl || this.isImageQueued(imageUrl)) {
      return;
    }
    
    this.downloadQueue.push({
      url: imageUrl,
      options,
      priority: options.priority || 'normal',
      addedAt: Date.now(),
    });
    
    // Sort queue by priority
    this.downloadQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    // Process queue if not already processing
    if (!this.isProcessingQueue) {
      this.processDownloadQueue();
    }
  }

  /**
   * Check if image is already queued
   */
  isImageQueued(imageUrl) {
    return this.downloadQueue.some(item => item.url === imageUrl);
  }

  /**
   * Process download queue
   */
  async processDownloadQueue() {
    if (this.isProcessingQueue || this.downloadQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    try {
      while (this.downloadQueue.length > 0) {
        const item = this.downloadQueue.shift();
        
        try {
          // Check if image is already cached
          const cached = await offlineStorageService.getCachedImage(item.url);
          if (!cached) {
            await this.downloadAndCacheImage(item.url, item.options);
          }
        } catch (error) {
          console.error(`Error processing queued image: ${item.url}`, error);
        }
        
        // Small delay between downloads to avoid overwhelming the network
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Preload images for a screen or component
   */
  async preloadImages(imageUrls, options = {}) {
    if (!Array.isArray(imageUrls)) {
      imageUrls = [imageUrls];
    }
    
    const preloadPromises = imageUrls
      .filter(url => url && this.isValidImageUrl(url))
      .map(url => {
        if (options.background) {
          this.queueImageDownload(url, { ...options, priority: 'low' });
          return Promise.resolve();
        } else {
          return this.getCachedImage(url, options);
        }
      });
    
    try {
      await Promise.allSettled(preloadPromises);
      console.log(`Preloaded ${imageUrls.length} images`);
    } catch (error) {
      console.error('Error preloading images:', error);
    }
  }

  /**
   * Convert blob to base64
   */
  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Compress image if needed
   */
  async compressImageIfNeeded(imageData, options = {}) {
    try {
      // Skip compression for small images or if disabled
      if (options.skipCompression || imageData.length < 100 * 1024) {
        return imageData;
      }
      
      // Use React Native's Image.getSize to check dimensions
      const imageUri = imageData;
      
      return new Promise((resolve) => {
        Image.getSize(
          imageUri,
          (width, height) => {
            // Compress if image is large
            if (width > 1920 || height > 1920) {
              // For now, just return original data
              // In a real implementation, you'd use a library like react-native-image-resizer
              console.log(`Image compression needed for ${width}x${height} image`);
            }
            resolve(imageData);
          },
          (error) => {
            console.error('Error getting image size:', error);
            resolve(imageData);
          }
        );
      });
    } catch (error) {
      console.error('Error compressing image:', error);
      return imageData;
    }
  }

  /**
   * Check if URL is a valid image URL
   */
  isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      const extension = pathname.split('.').pop();
      
      return this.supportedFormats.includes(extension);
    } catch (error) {
      return false;
    }
  }

  /**
   * Manage cache size by removing old images
   */
  async manageCacheSize() {
    try {
      const storageStats = await offlineStorageService.getStorageStats();
      
      if (storageStats && storageStats.totalSize > this.maxCacheSize) {
        console.log(`Cache size exceeded: ${storageStats.totalSize} bytes`);
        await this.cleanupOldImages();
      }
    } catch (error) {
      console.error('Error managing cache size:', error);
    }
  }

  /**
   * Clean up old cached images
   */
  async cleanupOldImages() {
    try {
      const cachedImages = await offlineStorageService.getData('cached_images') || {};
      const imageEntries = Object.entries(cachedImages);
      
      // Sort by timestamp (oldest first)
      imageEntries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 25% of images
      const toRemove = Math.ceil(imageEntries.length * 0.25);
      
      for (let i = 0; i < toRemove; i++) {
        const [imageUrl] = imageEntries[i];
        delete cachedImages[imageUrl];
        console.log(`Removed old cached image: ${imageUrl}`);
      }
      
      // Update cached images
      await offlineStorageService.storeData('cached_images', cachedImages);
      
      console.log(`Cleaned up ${toRemove} old images`);
    } catch (error) {
      console.error('Error cleaning up old images:', error);
    }
  }

  /**
   * Clear all cached images
   */
  async clearImageCache() {
    try {
      await offlineStorageService.removeData('cached_images');
      console.log('All cached images cleared');
      return true;
    } catch (error) {
      console.error('Error clearing image cache:', error);
      return false;
    }
  }

  /**
   * Get image cache statistics
   */
  async getImageCacheStats() {
    try {
      const cachedImages = await offlineStorageService.getData('cached_images') || {};
      const imageCount = Object.keys(cachedImages).length;
      
      let totalSize = 0;
      for (const imageData of Object.values(cachedImages)) {
        if (imageData.data) {
          totalSize += imageData.data.length;
        }
      }
      
      return {
        imageCount,
        totalSize,
        maxCacheSize: this.maxCacheSize,
        utilizationPercent: (totalSize / this.maxCacheSize) * 100,
        queueSize: this.downloadQueue.length,
        isProcessingQueue: this.isProcessingQueue,
      };
    } catch (error) {
      console.error('Error getting image cache stats:', error);
      return null;
    }
  }

  /**
   * Prefetch images for clinical records
   */
  async prefetchClinicalRecordImages(records) {
    const imageUrls = [];
    
    records.forEach(record => {
      // Extract image URLs from record data
      if (record.thumbnail_url) {
        imageUrls.push(record.thumbnail_url);
      }
      
      if (record.documents) {
        record.documents.forEach(doc => {
          if (doc.thumbnail_url) {
            imageUrls.push(doc.thumbnail_url);
          }
          if (doc.preview_url) {
            imageUrls.push(doc.preview_url);
          }
        });
      }
    });
    
    // Queue images for background download
    imageUrls.forEach(url => {
      this.queueImageDownload(url, { priority: 'low', background: true });
    });
    
    console.log(`Queued ${imageUrls.length} clinical record images for prefetch`);
  }

  /**
   * Prefetch user profile images
   */
  async prefetchUserImages(users) {
    const imageUrls = users
      .map(user => user.profile_image || user.avatar_url)
      .filter(Boolean);
    
    imageUrls.forEach(url => {
      this.queueImageDownload(url, { priority: 'normal' });
    });
    
    console.log(`Queued ${imageUrls.length} user profile images for prefetch`);
  }

  /**
   * Get cached image as React Native Image source
   */
  async getImageSource(imageUrl) {
    try {
      const cachedData = await this.getCachedImage(imageUrl);
      
      if (cachedData) {
        return { uri: cachedData };
      }
      
      // Return original URL as fallback
      return { uri: imageUrl };
    } catch (error) {
      console.error(`Error getting image source for ${imageUrl}:`, error);
      return { uri: imageUrl };
    }
  }

  /**
   * Cancel all pending downloads
   */
  cancelPendingDownloads() {
    this.downloadQueue = [];
    console.log('Cancelled all pending image downloads');
  }

  /**
   * Set cache configuration
   */
  setCacheConfig(config) {
    if (config.maxCacheSize) {
      this.maxCacheSize = config.maxCacheSize;
    }
    
    if (config.maxImageSize) {
      this.maxImageSize = config.maxImageSize;
    }
    
    if (config.compressionQuality) {
      this.compressionQuality = config.compressionQuality;
    }
    
    console.log('Image cache configuration updated:', config);
  }
}

export default new ImageCachingService();