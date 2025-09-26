import { Host, EngineeredFeatures, Summary } from '@/schemas';

export interface CachedHost {
  host: Host;
  features: EngineeredFeatures;
  summary?: Summary;
  createdAt: Date;
  summarizedAt?: Date;
}

class HostCache {
  private cache = new Map<string, CachedHost>();
  
  set(id: string, data: Omit<CachedHost, 'createdAt'>): void {
    this.cache.set(id, {
      ...data,
      createdAt: new Date(),
    });
  }
  
  get(id: string): CachedHost | undefined {
    return this.cache.get(id);
  }
  
  setSummary(id: string, summary: Summary): void {
    const cached = this.cache.get(id);
    if (cached) {
      cached.summary = summary;
      cached.summarizedAt = new Date();
    }
  }
  
  getAll(): Array<{ id: string; data: CachedHost }> {
    return Array.from(this.cache.entries()).map(([id, data]) => ({ id, data }));
  }
  
  has(id: string): boolean {
    return this.cache.has(id);
  }
  
  delete(id: string): void {
    this.cache.delete(id);
  }
  
  clear(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const hostCache = new HostCache();