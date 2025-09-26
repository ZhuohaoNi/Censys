import fs from 'fs';
import path from 'path';
import { Host, EngineeredFeatures, Summary } from '@/schemas';

export interface CachedHost {
  host: Host;
  features: EngineeredFeatures;
  summary?: Summary;
  createdAt: Date;
  summarizedAt?: Date;
}

const CACHE_DIR = path.join(process.cwd(), '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'hosts.json');

class PersistentHostCache {
  private cache = new Map<string, CachedHost>();
  private initialized = false;

  private ensureCacheDir(): void {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  }

  private loadFromDisk(): void {
    if (this.initialized) return;
    
    try {
      this.ensureCacheDir();
      
      if (fs.existsSync(CACHE_FILE)) {
        const data = fs.readFileSync(CACHE_FILE, 'utf8');
        const parsed = JSON.parse(data);
        
        // Convert date strings back to Date objects
        for (const [id, hostData] of Object.entries(parsed)) {
          const cachedHost = hostData as any;
          cachedHost.createdAt = new Date(cachedHost.createdAt);
          if (cachedHost.summarizedAt) {
            cachedHost.summarizedAt = new Date(cachedHost.summarizedAt);
          }
          this.cache.set(id, cachedHost);
        }
      }
    } catch (error) {
      console.error('Error loading cache from disk:', error);
      // Continue with empty cache
    }
    
    this.initialized = true;
  }

  private saveToDisk(): void {
    try {
      this.ensureCacheDir();
      
      const data = Object.fromEntries(this.cache.entries());
      fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving cache to disk:', error);
    }
  }

  set(id: string, data: Omit<CachedHost, 'createdAt'>): void {
    this.loadFromDisk();
    
    this.cache.set(id, {
      ...data,
      createdAt: new Date(),
    });
    
    this.saveToDisk();
  }

  get(id: string): CachedHost | undefined {
    this.loadFromDisk();
    return this.cache.get(id);
  }

  setSummary(id: string, summary: Summary): void {
    this.loadFromDisk();
    
    const cached = this.cache.get(id);
    if (cached) {
      cached.summary = summary;
      cached.summarizedAt = new Date();
      this.saveToDisk();
    }
  }

  getAll(): Array<{ id: string; data: CachedHost }> {
    this.loadFromDisk();
    return Array.from(this.cache.entries()).map(([id, data]) => ({ id, data }));
  }

  has(id: string): boolean {
    this.loadFromDisk();
    return this.cache.has(id);
  }

  delete(id: string): void {
    this.loadFromDisk();
    this.cache.delete(id);
    this.saveToDisk();
  }

  clear(): void {
    this.loadFromDisk();
    this.cache.clear();
    this.saveToDisk();
  }
}

// Singleton instance
export const persistentHostCache = new PersistentHostCache();