import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  nodeEnv: string;
  port: number;
  apiVersion: string;
  
  database: {
    url: string;
    ssl: boolean;
    pool: {
      min: number;
      max: number;
    };
  };
  
  redis: {
    url: string;
    ttl: number;
  };
  
  blockchain: {
    networks: {
      mainnet: {
        url: string;
        chainId: number;
      };
      goerli: {
        url: string;
        chainId: number;
      };
      polygon: {
        url: string;
        chainId: number;
      };
      mumbai: {
        url: string;
        chainId: number;
      };
    };
    privateKey: string;
    gasPrice: {
      standard: string;
      fast: string;
      instant: string;
    };
  };
  
  contracts: {
    nilVault: string;
    contractNFT: string;
    complianceRegistry: string;
  };
  
  jwt: {
    secret: string;
    expiresIn: string;
  };
  
  cors: {
    allowedOrigins: string[];
  };
  
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
  };
  
  logging: {
    level: string;
    file: {
      enabled: boolean;
      filename: string;
      maxsize: number;
      maxFiles: number;
    };
  };
  
  platforms: {
    siloCloud: {
      apiUrl: string;
      apiKey: string;
    };
    opendorse: {
      apiKey: string;
      webhookSecret: string;
    };
    inflcr: {
      apiKey: string;
      webhookSecret: string;
    };
    basepath: {
      apiKey: string;
      webhookSecret: string;
    };
  };
  
  ipfs: {
    gateway: string;
    pinata: {
      apiKey: string;
      secretKey: string;
    };
  };
  
  monitoring: {
    sentry: {
      dsn: string;
    };
  };
}

export const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://nil_user:nil_password@localhost:5432/nil_transparency_db',
    ssl: process.env.NODE_ENV === 'production',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    },
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
  },
  
  blockchain: {
    networks: {
      mainnet: {
        url: process.env.MAINNET_URL || '',
        chainId: 1,
      },
      goerli: {
        url: process.env.GOERLI_URL || '',
        chainId: 5,
      },
      polygon: {
        url: process.env.POLYGON_URL || 'https://polygon-rpc.com/',
        chainId: 137,
      },
      mumbai: {
        url: process.env.MUMBAI_URL || 'https://rpc-mumbai.maticvigil.com/',
        chainId: 80001,
      },
    },
    privateKey: process.env.PRIVATE_KEY || '',
    gasPrice: {
      standard: process.env.GAS_PRICE_STANDARD || '20000000000', // 20 gwei
      fast: process.env.GAS_PRICE_FAST || '30000000000', // 30 gwei
      instant: process.env.GAS_PRICE_INSTANT || '50000000000', // 50 gwei
    },
  },
  
  contracts: {
    nilVault: process.env.NIL_VAULT_ADDRESS || '',
    contractNFT: process.env.CONTRACT_NFT_ADDRESS || '',
    complianceRegistry: process.env.COMPLIANCE_REGISTRY_ADDRESS || '',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3001'],
  },
  
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      enabled: process.env.LOG_FILE_ENABLED === 'true',
      filename: process.env.LOG_FILE_NAME || 'nil-transparency.log',
      maxsize: parseInt(process.env.LOG_FILE_MAX_SIZE || '10485760', 10), // 10MB
      maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES || '5', 10),
    },
  },
  
  platforms: {
    siloCloud: {
      apiUrl: process.env.SILO_CLOUD_API_URL || 'https://api.silocloud.com',
      apiKey: process.env.SILO_CLOUD_API_KEY || '',
    },
    opendorse: {
      apiKey: process.env.OPENDORSE_API_KEY || '',
      webhookSecret: process.env.OPENDORSE_WEBHOOK_SECRET || '',
    },
    inflcr: {
      apiKey: process.env.INFLCR_API_KEY || '',
      webhookSecret: process.env.INFLCR_WEBHOOK_SECRET || '',
    },
    basepath: {
      apiKey: process.env.BASEPATH_API_KEY || '',
      webhookSecret: process.env.BASEPATH_WEBHOOK_SECRET || '',
    },
  },
  
  ipfs: {
    gateway: process.env.IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs/',
    pinata: {
      apiKey: process.env.PINATA_API_KEY || '',
      secretKey: process.env.PINATA_SECRET_KEY || '',
    },
  },
  
  monitoring: {
    sentry: {
      dsn: process.env.SENTRY_DSN || '',
    },
  },
};