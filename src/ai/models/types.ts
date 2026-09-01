export interface WebGPUAdapterInfo {
  vendor: string;
  architecture: string;
  device: string;
  description: string;
}

export interface WebGPULimits {
  maxBufferSize: number;
  maxStorageBufferBindingSize: number;
  maxComputeWorkgroupSizeX: number;
  maxComputeWorkgroupSizeY: number;
  maxComputeWorkgroupSizeZ: number;
  maxComputeInvocationsPerWorkgroup: number;
}

export interface HardwareCapability {
  hasWebGPU: boolean;
  hasWasmSIMD: boolean;
  hasSharedArrayBuffer: boolean;
  deviceMemoryGB?: number;
  logicalCores?: number;
  adapterInfo?: WebGPUAdapterInfo;
  limits?: WebGPULimits;
  preferredBackend: 'webgpu' | 'wasm' | 'cpu';
  readinessStatus: 'optimal' | 'fallback' | 'unsupported';
  diagnosticsMessage: string;
}
