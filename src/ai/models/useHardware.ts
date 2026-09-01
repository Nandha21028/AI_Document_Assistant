import { useState, useEffect } from 'react';
import type { HardwareCapability } from './types';
import { detectHardwareCapabilities } from './detector';

export function useHardware() {
  const [capability, setCapability] = useState<HardwareCapability | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function runDetection() {
      try {
        setIsLoading(true);
        const result = await detectHardwareCapabilities();
        if (isMounted) {
          setCapability(result);
        }
      } catch (error) {
        console.error('Failed to detect hardware capabilities:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    runDetection();

    return () => {
      isMounted = false;
    };
  }, []);

  return { capability, isLoading };
}
