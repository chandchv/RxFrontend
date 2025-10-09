import { Image } from 'react-native';
import imageCachingService from '../../services/imageCachingService';
import offlineStorageService from '../../services/offlineStorageService';

// Mock dependencies
jest.mock('react-native', () => ({
  Image: {
    getSize: jest.fn(),
  },
}));

jest.mock('../../services/offlineStorageService');

// Mock fetch
global.fetch = jest.fn();
global.FileReader = jest.fn(() => ({
  readAsDataURL: jest.fn(),
  onload: null,
  onerror: null,
  result: 'data:image/jpeg;base64,mockImageData',
}));

global.Blob = jest.fn(() => ({
  size: 1024,
}));

describe('ImageCachingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Reset service state
    imageCachingService.downloadQueue = [];
    imageCachingService.isProcessingQueue = false;
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('Image URL Validation', () => {
    it('should validate supported image URLs', () => {
      const validUrls = [
        'https://example.com/image.jpg',
        'https://example.com/image.jpeg',
        'https://example.com/image.png',
        'https://example.com/image.gif',
        'https://example.com/image.webp',
        'https://example.com/document.pdf',
      ];
      
      validUrls.forEach(url => {
        expect(imageCachingService.isValidImageUrl(url)).toBe(true);
      });
    });

    it('should reject invalid image URLs', () => {
      const invalidUrls = [
        null,
        undefined,
        '',
        'not-a-url',
        'https://example.com/file.txt',
        'https://example.com/file.doc',
        'https://example.com/file',
      ];
      
      invalidUrls.forEach(url => {
        expect(imageCachingService.isValidImageUrl(url)).toBe(false);
      });
    });
  });

  describe('getCachedImage', () => {
    it('should return cached image when available', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      const cachedData = 'data:image/jpeg;base64,cachedImageData';
      
      offlineStorageService.getCachedImage.mockResolvedValue(cachedData);
      
      const result = await imageCachingService.getCachedImage(imageUrl);
      
      expect(result).toBe(cachedData);
      expect(offlineStorageService.getCachedImage).toHaveBeenCalledWith(imageUrl);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Image cache hit'));
    });

    it('should download and cache image when not cached', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      const downloadedData = 'data:image/jpeg;base64,downloadedImageData';
      
      offlineStorageService.getCachedImage.mockResolvedValue(null);
      
      jest.spyOn(imageCachingService, 'downloadAndCacheImage')
        .mockResolvedValue(downloadedData);
      
      const result = await imageCachingService.getCachedImage(imageUrl);
      
      expect(result).toBe(downloadedData);
      expect(imageCachingService.downloadAndCacheImage).toHaveBeenCalledWith(imageUrl, {});
    });

    it('should return cached fallback on download error', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      const cachedData = 'data:image/jpeg;base64,cachedImageData';
      
      offlineStorageService.getCachedImage
        .mockResolvedValueOnce(null) // First call - no cache
        .mockResolvedValueOnce(cachedData); // Second call - fallback
      
      jest.spyOn(imageCachingService, 'downloadAndCacheImage')
        .mockRejectedValue(new Error('Download failed'));
      
      const result = await imageCachingService.getCachedImage(imageUrl);
      
      expect(result).toBe(cachedData);
    });

    it('should force refresh when requested', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      const downloadedData = 'data:image/jpeg;base64,downloadedImageData';
      
      offlineStorageService.getCachedImage.mockResolvedValue('old-cached-data');
      
      jest.spyOn(imageCachingService, 'downloadAndCacheImage')
        .mockResolvedValue(downloadedData);
      
      const result = await imageCachingService.getCachedImage(imageUrl, { forceRefresh: true });
      
      expect(result).toBe(downloadedData);
      expect(imageCachingService.downloadAndCacheImage).toHaveBeenCalled();
    });
  });

  describe('downloadAndCacheImage', () => {
    it('should download and cache image successfully', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      const mockBlob = { size: 1024 };
      const mockResponse = {
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('1024'),
        },
        blob: jest.fn().mockResolvedValue(mockBlob),
      };
      
      fetch.mockResolvedValue(mockResponse);
      
      jest.spyOn(imageCachingService, 'manageCacheSize').mockResolvedValue();
      jest.spyOn(imageCachingService, 'blobToBase64')
        .mockResolvedValue('data:image/jpeg;base64,imageData');
      jest.spyOn(imageCachingService, 'compressImageIfNeeded')
        .mockResolvedValue('data:image/jpeg;base64,compressedData');
      
      offlineStorageService.cacheImage.mockResolvedValue(true);
      
      const result = await imageCachingService.downloadAndCacheImage(imageUrl);
      
      expect(result).toBe('data:image/jpeg;base64,compressedData');
      expect(fetch).toHaveBeenCalledWith(imageUrl, expect.objectContaining({
        method: 'GET',
        headers: { 'Accept': 'image/*' },
      }));
      expect(offlineStorageService.cacheImage).toHaveBeenCalled();
    });

    it('should reject unsupported image formats', async () => {
      const imageUrl = 'https://example.com/file.txt';
      
      await expect(imageCachingService.downloadAndCacheImage(imageUrl))
        .rejects.toThrow('Unsupported image format');
    });

    it('should reject images that are too large', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      const mockResponse = {
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('10485760'), // 10MB
        },
      };
      
      fetch.mockResolvedValue(mockResponse);
      jest.spyOn(imageCachingService, 'manageCacheSize').mockResolvedValue();
      
      await expect(imageCachingService.downloadAndCacheImage(imageUrl))
        .rejects.toThrow('Image too large');
    });

    it('should handle HTTP errors', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      };
      
      fetch.mockResolvedValue(mockResponse);
      jest.spyOn(imageCachingService, 'manageCacheSize').mockResolvedValue();
      
      await expect(imageCachingService.downloadAndCacheImage(imageUrl))
        .rejects.toThrow('HTTP 404: Not Found');
    });
  });

  describe('Download Queue Management', () => {
    it('should queue image for download', () => {
      const imageUrl = 'https://example.com/image.jpg';
      
      imageCachingService.queueImageDownload(imageUrl, { priority: 'high' });
      
      expect(imageCachingService.downloadQueue).toHaveLength(1);
      expect(imageCachingService.downloadQueue[0]).toMatchObject({
        url: imageUrl,
        priority: 'high',
      });
    });

    it('should not queue duplicate images', () => {
      const imageUrl = 'https://example.com/image.jpg';
      
      imageCachingService.queueImageDownload(imageUrl);
      imageCachingService.queueImageDownload(imageUrl);
      
      expect(imageCachingService.downloadQueue).toHaveLength(1);
    });

    it('should sort queue by priority', () => {
      imageCachingService.queueImageDownload('https://example.com/low.jpg', { priority: 'low' });
      imageCachingService.queueImageDownload('https://example.com/high.jpg', { priority: 'high' });
      imageCachingService.queueImageDownload('https://example.com/normal.jpg', { priority: 'normal' });
      
      expect(imageCachingService.downloadQueue[0].url).toBe('https://example.com/high.jpg');
      expect(imageCachingService.downloadQueue[1].url).toBe('https://example.com/normal.jpg');
      expect(imageCachingService.downloadQueue[2].url).toBe('https://example.com/low.jpg');
    });

    it('should process download queue', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      
      imageCachingService.downloadQueue.push({
        url: imageUrl,
        options: {},
        priority: 'normal',
        addedAt: Date.now(),
      });
      
      offlineStorageService.getCachedImage.mockResolvedValue(null);
      jest.spyOn(imageCachingService, 'downloadAndCacheImage')
        .mockResolvedValue('cached-data');
      
      await imageCachingService.processDownloadQueue();
      
      expect(imageCachingService.downloadAndCacheImage).toHaveBeenCalledWith(imageUrl, {});
      expect(imageCachingService.downloadQueue).toHaveLength(0);
    });

    it('should skip already cached images in queue', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      
      imageCachingService.downloadQueue.push({
        url: imageUrl,
        options: {},
        priority: 'normal',
        addedAt: Date.now(),
      });
      
      offlineStorageService.getCachedImage.mockResolvedValue('already-cached');
      jest.spyOn(imageCachingService, 'downloadAndCacheImage');
      
      await imageCachingService.processDownloadQueue();
      
      expect(imageCachingService.downloadAndCacheImage).not.toHaveBeenCalled();
    });
  });

  describe('Image Preloading', () => {
    it('should preload multiple images', async () => {
      const imageUrls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
      ];
      
      jest.spyOn(imageCachingService, 'getCachedImage')
        .mockResolvedValue('cached-data');
      
      await imageCachingService.preloadImages(imageUrls);
      
      expect(imageCachingService.getCachedImage).toHaveBeenCalledTimes(3);
    });

    it('should queue images for background preloading', async () => {
      const imageUrls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ];
      
      jest.spyOn(imageCachingService, 'queueImageDownload');
      
      await imageCachingService.preloadImages(imageUrls, { background: true });
      
      expect(imageCachingService.queueImageDownload).toHaveBeenCalledTimes(2);
      expect(imageCachingService.queueImageDownload).toHaveBeenCalledWith(
        imageUrls[0],
        expect.objectContaining({ priority: 'low' })
      );
    });

    it('should filter out invalid URLs', async () => {
      const imageUrls = [
        'https://example.com/image.jpg',
        'invalid-url',
        null,
        'https://example.com/file.txt',
      ];
      
      jest.spyOn(imageCachingService, 'getCachedImage')
        .mockResolvedValue('cached-data');
      
      await imageCachingService.preloadImages(imageUrls);
      
      expect(imageCachingService.getCachedImage).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Management', () => {
    it('should manage cache size by cleaning up old images', async () => {
      const storageStats = { totalSize: 150 * 1024 * 1024 }; // 150MB
      
      offlineStorageService.getStorageStats.mockResolvedValue(storageStats);
      jest.spyOn(imageCachingService, 'cleanupOldImages').mockResolvedValue();
      
      await imageCachingService.manageCacheSize();
      
      expect(imageCachingService.cleanupOldImages).toHaveBeenCalled();
    });

    it('should clean up old cached images', async () => {
      const cachedImages = {
        'https://example.com/old.jpg': { timestamp: Date.now() - 86400000 }, // 1 day ago
        'https://example.com/new.jpg': { timestamp: Date.now() - 3600000 }, // 1 hour ago
        'https://example.com/newer.jpg': { timestamp: Date.now() - 1800000 }, // 30 min ago
        'https://example.com/newest.jpg': { timestamp: Date.now() - 900000 }, // 15 min ago
      };
      
      offlineStorageService.getData.mockResolvedValue(cachedImages);
      offlineStorageService.storeData.mockResolvedValue(true);
      
      await imageCachingService.cleanupOldImages();
      
      expect(offlineStorageService.storeData).toHaveBeenCalledWith(
        'cached_images',
        expect.not.objectContaining({
          'https://example.com/old.jpg': expect.anything(),
        })
      );
    });

    it('should clear all cached images', async () => {
      offlineStorageService.removeData.mockResolvedValue(true);
      
      const result = await imageCachingService.clearImageCache();
      
      expect(result).toBe(true);
      expect(offlineStorageService.removeData).toHaveBeenCalledWith('cached_images');
    });
  });

  describe('Image Cache Statistics', () => {
    it('should return image cache statistics', async () => {
      const cachedImages = {
        'https://example.com/image1.jpg': { data: 'data1' },
        'https://example.com/image2.jpg': { data: 'data2' },
      };
      
      offlineStorageService.getData.mockResolvedValue(cachedImages);
      
      const stats = await imageCachingService.getImageCacheStats();
      
      expect(stats).toMatchObject({
        imageCount: 2,
        totalSize: expect.any(Number),
        maxCacheSize: imageCachingService.maxCacheSize,
        utilizationPercent: expect.any(Number),
        queueSize: 0,
        isProcessingQueue: false,
      });
    });

    it('should handle missing cached images data', async () => {
      offlineStorageService.getData.mockResolvedValue(null);
      
      const stats = await imageCachingService.getImageCacheStats();
      
      expect(stats.imageCount).toBe(0);
      expect(stats.totalSize).toBe(0);
    });
  });

  describe('Specialized Prefetching', () => {
    it('should prefetch clinical record images', async () => {
      const records = [
        {
          thumbnail_url: 'https://example.com/thumb1.jpg',
          documents: [
            { thumbnail_url: 'https://example.com/doc1_thumb.jpg' },
            { preview_url: 'https://example.com/doc1_preview.jpg' },
          ],
        },
        {
          thumbnail_url: 'https://example.com/thumb2.jpg',
          documents: [
            { thumbnail_url: 'https://example.com/doc2_thumb.jpg' },
          ],
        },
      ];
      
      jest.spyOn(imageCachingService, 'queueImageDownload');
      
      await imageCachingService.prefetchClinicalRecordImages(records);
      
      expect(imageCachingService.queueImageDownload).toHaveBeenCalledTimes(5);
      expect(imageCachingService.queueImageDownload).toHaveBeenCalledWith(
        'https://example.com/thumb1.jpg',
        expect.objectContaining({ priority: 'low' })
      );
    });

    it('should prefetch user profile images', async () => {
      const users = [
        { profile_image: 'https://example.com/user1.jpg' },
        { avatar_url: 'https://example.com/user2.jpg' },
        { name: 'User without image' },
      ];
      
      jest.spyOn(imageCachingService, 'queueImageDownload');
      
      await imageCachingService.prefetchUserImages(users);
      
      expect(imageCachingService.queueImageDownload).toHaveBeenCalledTimes(2);
      expect(imageCachingService.queueImageDownload).toHaveBeenCalledWith(
        'https://example.com/user1.jpg',
        expect.objectContaining({ priority: 'normal' })
      );
    });
  });

  describe('Image Source Generation', () => {
    it('should return cached image as source', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      const cachedData = 'data:image/jpeg;base64,cachedData';
      
      jest.spyOn(imageCachingService, 'getCachedImage')
        .mockResolvedValue(cachedData);
      
      const source = await imageCachingService.getImageSource(imageUrl);
      
      expect(source).toEqual({ uri: cachedData });
    });

    it('should return original URL as fallback', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      
      jest.spyOn(imageCachingService, 'getCachedImage')
        .mockRejectedValue(new Error('Cache error'));
      
      const source = await imageCachingService.getImageSource(imageUrl);
      
      expect(source).toEqual({ uri: imageUrl });
    });
  });

  describe('Configuration', () => {
    it('should update cache configuration', () => {
      const config = {
        maxCacheSize: 200 * 1024 * 1024, // 200MB
        maxImageSize: 10 * 1024 * 1024, // 10MB
        compressionQuality: 0.9,
      };
      
      imageCachingService.setCacheConfig(config);
      
      expect(imageCachingService.maxCacheSize).toBe(config.maxCacheSize);
      expect(imageCachingService.maxImageSize).toBe(config.maxImageSize);
      expect(imageCachingService.compressionQuality).toBe(config.compressionQuality);
    });

    it('should cancel pending downloads', () => {
      imageCachingService.downloadQueue = [
        { url: 'https://example.com/image1.jpg' },
        { url: 'https://example.com/image2.jpg' },
      ];
      
      imageCachingService.cancelPendingDownloads();
      
      expect(imageCachingService.downloadQueue).toHaveLength(0);
    });
  });
});