/**
 * Caching System for Performance Optimization
 * Requirements: 8.3, 8.4, 8.5
 */

import { logger } from './Logger.js';

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

export interface CacheConfig {
  maxSize: number;
  defaultTtl: number;
  cleanupInterval: number;
  enableStats: boolean;
}

class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0
  };
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
      defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '300000'), // 5 minutes
      cleanupInterval: parseInt(process.env.CACHE_CLEANUP_INTERVAL || '60000'), // 1 minute
      enableStats: process.env.CACHE_ENABLE_STATS !== 'false',
      ...config
    };

    this.startCleanupTimer();
    logger.info('Cache service initialized', { config: this.config }, { component: 'cache' });
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      logger.debug(`Cache cleanup: removed ${expiredCount} expired entries`, 
        { expiredCount, totalEntries: this.cache.size }, 
        { component: 'cache' }
      );
    }

    // Evict oldest entries if cache is too large
    if (this.cache.size > this.config.maxSize) {
      const entriesToEvict = this.cache.size - this.config.maxSize;
      const sortedEntries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);

      for (let i = 0; i < entriesToEvict; i++) {
        const [key] = sortedEntries[i];
        this.cache.delete(key);
        this.stats.evictions++;
      }

      logger.debug(`Cache eviction: removed ${entriesToEvict} oldest entries`, 
        { evictedCount: entriesToEvict, totalEntries: this.cache.size }, 
        { component: 'cache' }
      );
    }
  }

  public set<T>(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTtl,
      hits: 0
    };

    this.cache.set(key, entry);
    this.stats.sets++;

    logger.trace(`Cache set: ${key}`, { ttl: entry.ttl }, { component: 'cache' });
  }

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      logger.trace(`Cache miss: ${key}`, undefined, { component: 'cache' });
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      logger.trace(`Cache expired: ${key}`, { age: now - entry.timestamp }, { component: 'cache' });
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    logger.trace(`Cache hit: ${key}`, { hits: entry.hits }, { component: 'cache' });
    return entry.value;
  }

  public has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  public delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      logger.trace(`Cache delete: ${key}`, undefined, { component: 'cache' });
    }
    return deleted;
  }

  public clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`Cache cleared: ${size} entries removed`, { size }, { component: 'cache' });
  }

  public getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(e => e.timestamp);

    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
        : 0,
      memoryUsage: this.getMemoryUsage(),
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0
    };
  }

  private getMemoryUsage(): number {
    // Rough estimation of memory usage
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // UTF-16 characters
      size += JSON.stringify(entry.value).length * 2;
      size += 64; // Overhead for entry metadata
    }
    return size;
  }

  public getDetailedStats(): {
    basic: CacheStats;
    operations: { hits: number; misses: number; sets: number; deletes: number; evictions: number };
    config: CacheConfig;
    topKeys: Array<{ key: string; hits: number; age: number }>;
  } {
    const now = Date.now();
    const topKeys = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        hits: entry.hits,
        age: now - entry.timestamp
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10);

    return {
      basic: this.getStats(),
      operations: { ...this.stats },
      config: { ...this.config },
      topKeys
    };
  }

  // Specialized caching methods for common use cases

  public cacheAgentPrompt(agentId: string, prompt: string, ttl: number = 3600000): void {
    this.set(`agent:prompt:${agentId}`, prompt, ttl);
  }

  public getAgentPrompt(agentId: string): string | null {
    return this.get(`agent:prompt:${agentId}`);
  }

  public cacheOllamaResponse(promptHash: string, response: string, ttl: number = 1800000): void {
    this.set(`ollama:response:${promptHash}`, response, ttl);
  }

  public getOllamaResponse(promptHash: string): string | null {
    return this.get(`ollama:response:${promptHash}`);
  }

  public cacheProjectData(projectId: string, data: any, ttl: number = 300000): void {
    this.set(`project:${projectId}`, data, ttl);
  }

  public getProjectData(projectId: string): any | null {
    return this.get(`project:${projectId}`);
  }

  public cacheAgentStats(stats: any, ttl: number = 60000): void {
    this.set('agent:stats', stats, ttl);
  }

  public getAgentStats(): any | null {
    return this.get('agent:stats');
  }

  public cacheHealthStatus(status: any, ttl: number = 30000): void {
    this.set('health:status', status, ttl);
  }

  public getHealthStatus(): any | null {
    return this.get('health:status');
  }

  // Batch operations
  public setMany<T>(entries: Array<{ key: string; value: T; ttl?: number }>): void {
    entries.forEach(({ key, value, ttl }) => {
      this.set(key, value, ttl);
    });
  }

  public getMany<T>(keys: string[]): Array<{ key: string; value: T | null }> {
    return keys.map(key => ({
      key,
      value: this.get<T>(key)
    }));
  }

  public deleteMany(keys: string[]): number {
    let deletedCount = 0;
    keys.forEach(key => {
      if (this.delete(key)) {
        deletedCount++;
      }
    });
    return deletedCount;
  }

  // Pattern-based operations
  public deleteByPattern(pattern: RegExp): number {
    let deletedCount = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      logger.debug(`Cache pattern delete: removed ${deletedCount} entries`, 
        { pattern: pattern.toString(), deletedCount }, 
        { component: 'cache' }
      );
    }
    
    return deletedCount;
  }

  public getKeysByPattern(pattern: RegExp): string[] {
    const matchingKeys: string[] = [];
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        matchingKeys.push(key);
      }
    }
    return matchingKeys;
  }

  // Utility methods
  public warmup(entries: Array<{ key: string; value: any; ttl?: number }>): void {
    logger.info(`Cache warmup: loading ${entries.length} entries`, 
      { count: entries.length }, 
      { component: 'cache' }
    );
    
    entries.forEach(({ key, value, ttl }) => {
      this.set(key, value, ttl);
    });
  }

  public export(): Array<{ key: string; value: any; timestamp: number; ttl: number; hits: number }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      value: entry.value,
      timestamp: entry.timestamp,
      ttl: entry.ttl,
      hits: entry.hits
    }));
  }

  public import(data: Array<{ key: string; value: any; timestamp: number; ttl: number; hits: number }>): void {
    const now = Date.now();
    let importedCount = 0;

    data.forEach(({ key, value, timestamp, ttl, hits }) => {
      // Only import non-expired entries
      if (now - timestamp < ttl) {
        const entry: CacheEntry<any> = {
          value,
          timestamp,
          ttl,
          hits
        };
        this.cache.set(key, entry);
        importedCount++;
      }
    });

    logger.info(`Cache import: loaded ${importedCount} entries`, 
      { importedCount, totalProvided: data.length }, 
      { component: 'cache' }
    );
  }

  public shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
    logger.info('Cache service shutdown', undefined, { component: 'cache' });
  }
}

// Create singleton instance
export const cache = new CacheService();

// Export for testing and custom configurations
export { CacheService };