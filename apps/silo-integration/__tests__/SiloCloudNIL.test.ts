import { SiloCloudNIL } from '../SiloCloudNIL';

describe('SiloCloudNIL', () => {
  it('should export the SiloCloudNIL class', () => {
    expect(SiloCloudNIL).toBeDefined();
    expect(typeof SiloCloudNIL).toBe('function');
  });

  it('should be constructable with valid config', () => {
    const mockProvider = {} as any;
    const mockSigner = {} as any;

    const config = {
      provider: mockProvider,
      signer: mockSigner,
      contractAddresses: {
        nilVault: '0x1234567890123456789012345678901234567890',
        contractNFT: '0x0987654321098765432109876543210987654321',
        complianceRegistry: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      },
      siloCloudConfig: {
        apiBaseUrl: 'https://api.silocloud.com',
        apiKey: 'test-api-key',
      },
    };

    const instance = new SiloCloudNIL(config);
    expect(instance).toBeInstanceOf(SiloCloudNIL);
  });
});
