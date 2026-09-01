import type { HardwareCapability, WebGPUAdapterInfo, WebGPULimits } from './types';

function checkWasmSIMD(): boolean {
  try {
    return WebAssembly.validate(
      new Uint8Array([
        0, 97, 115, 109,
        1, 0, 0, 0,
        1, 5, 1, 96, 0, 1, 123,
        3, 2, 1, 0,
        10, 10, 1, 8, 0,
        253, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        11
      ])
    );
  } catch {
    return false;
  }
}

export async function detectHardwareCapabilities(): Promise<HardwareCapability> {
  const hasWasmSIMD = checkWasmSIMD();
  const hasSharedArrayBuffer = typeof window !== 'undefined' && typeof window.SharedArrayBuffer !== 'undefined';
  const logicalCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  const deviceMemoryGB = typeof navigator !== 'undefined' && 'deviceMemory' in navigator 
    ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory 
    : undefined;

  if (typeof navigator === 'undefined' || !navigator.gpu) {
    return {
      hasWebGPU: false,
      hasWasmSIMD,
      hasSharedArrayBuffer,
      deviceMemoryGB,
      logicalCores,
      preferredBackend: hasWasmSIMD ? 'wasm' : 'cpu',
      readinessStatus: hasWasmSIMD ? 'fallback' : 'unsupported',
      diagnosticsMessage: 'WebGPU is not supported or enabled in this browser. Falling back to WebAssembly (CPU). Inference may be slower.',
    };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });

    if (!adapter) {
      return {
        hasWebGPU: false,
        hasWasmSIMD,
        hasSharedArrayBuffer,
        deviceMemoryGB,
        logicalCores,
        preferredBackend: hasWasmSIMD ? 'wasm' : 'cpu',
        readinessStatus: 'fallback',
        diagnosticsMessage: 'WebGPU API exists, but no compatible GPU adapter was found. Falling back to WASM.',
      };
    }

    let adapterInfo: WebGPUAdapterInfo = {
      vendor: 'Unknown GPU Vendor',
      architecture: 'Unknown Architecture',
      device: 'Generic GPU',
      description: 'WebGPU Compatible Adapter',
    };

    if ('requestAdapterInfo' in adapter && typeof (adapter as any).requestAdapterInfo === 'function') {
      try {
        const info = await (adapter as any).requestAdapterInfo();
        adapterInfo = {
          vendor: info.vendor || 'Unknown',
          architecture: info.architecture || 'Unknown',
          device: info.device || 'Default Device',
          description: info.description || `${info.vendor} ${info.device}`.trim() || 'Active GPU Adapter',
        };
      } catch {
        // Fingerprinting protection fallback
      }
    }

    const limits: WebGPULimits = {
      maxBufferSize: adapter.limits.maxBufferSize,
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      maxComputeWorkgroupSizeX: adapter.limits.maxComputeWorkgroupSizeX,
      maxComputeWorkgroupSizeY: adapter.limits.maxComputeWorkgroupSizeY,
      maxComputeWorkgroupSizeZ: adapter.limits.maxComputeWorkgroupSizeZ,
      maxComputeInvocationsPerWorkgroup: adapter.limits.maxComputeInvocationsPerWorkgroup,
    };

    return {
      hasWebGPU: true,
      hasWasmSIMD,
      hasSharedArrayBuffer,
      deviceMemoryGB,
      logicalCores,
      adapterInfo,
      limits,
      preferredBackend: 'webgpu',
      readinessStatus: 'optimal',
      diagnosticsMessage: 'WebGPU high-performance hardware acceleration is active and ready for local LLM & embedding inference.',
    };
  } catch (err) {
    return {
      hasWebGPU: false,
      hasWasmSIMD,
      hasSharedArrayBuffer,
      deviceMemoryGB,
      logicalCores,
      preferredBackend: hasWasmSIMD ? 'wasm' : 'cpu',
      readinessStatus: 'fallback',
      diagnosticsMessage: `Error initializing WebGPU: ${err instanceof Error ? err.message : String(err)}. Falling back to WASM.`,
    };
  }
}
