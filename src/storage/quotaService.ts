import type { StorageQuotaInfo } from './types';

export const quotaService = {
  /**
   * Retrieves estimated IndexedDB storage usage and quota from the browser.
   */
  async getQuota(): Promise<StorageQuotaInfo> {
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
      return {
        usageBytes: 0,
        quotaBytes: 1024 * 1024 * 1024, // 1 GB fallback
        usagePercentage: 0,
        isPersistent: false,
      };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const isPersistent = navigator.storage.persisted ? await navigator.storage.persisted() : false;

      const usageBytes = estimate.usage || 0;
      const quotaBytes = estimate.quota || 1;
      const usagePercentage = Math.min(100, Math.round((usageBytes / quotaBytes) * 10000) / 100);

      return {
        usageBytes,
        quotaBytes,
        usagePercentage,
        isPersistent,
      };
    } catch (err) {
      console.warn('Failed to query storage estimate:', err);
      return {
        usageBytes: 0,
        quotaBytes: 1024 * 1024 * 1024,
        usagePercentage: 0,
        isPersistent: false,
      };
    }
  },

  /**
   * Requests the browser not to evict this origin's IndexedDB data under disk pressure.
   */
  async requestPersistence(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist();
    }
    return false;
  },
};
