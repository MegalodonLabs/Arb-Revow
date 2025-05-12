interface Window {
  ethereum: {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    selectedAddress: string;
    on: (event: string, callback: (...args: any[]) => void) => void;
    isMetaMask?: boolean;
  };
  
  // Sistema de armazenamento IPFS
  revowIPFSMapping?: Record<string, {
    data: any;
    timestamp: number;
    source: string;
  }>;
  
  // Cache de dados de pledges
  revowPledgeData?: Record<string, any>;
}
