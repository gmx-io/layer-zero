# GMX Liquidity Vault (GLV) & GM Token Deployment

This project provides a comprehensive deployment and configuration system for GMX Liquidity Vault (GLV) and GM tokens across multiple blockchain networks using LayerZero's OmniChain technology.

## 📋 Table of Contents

- [Setup](#setup)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [LayerZero Wiring](#layerzero-wiring)
- [Validation](#validation)
- [Project Structure](#project-structure)

## 🚀 Setup

### Prerequisites
- Node.js 18+
- pnpm (package manager)
- Private keys for deployer accounts

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Deployer Private Keys (Required)
PRIVATE_KEY_GM_DEPLOYER=0x...    # Private key for GM token deployments
PRIVATE_KEY_GLV_DEPLOYER=0x...   # Private key for GLV token deployments

# Optional: Public keys for reference
PUBLIC_KEY_GM_DEPLOYER=0x...
PUBLIC_KEY_GLV_DEPLOYER=0x...

# Mainnet RPCs
RPC_URL_ARBITRUM_MAINNET=https://...
RPC_URL_BASE_MAINNET=https://...
RPC_URL_BSC_MAINNET=https://...
RPC_URL_BOTANIX_MAINNET=https://...
RPC_URL_BERA_MAINNET=https://...
RPC_URL_ETHEREUM_MAINNET=https://...

# Testnet RPCs
RPC_URL_ARBITRUM_TESTNET=https://...
RPC_URL_ETHEREUM_TESTNET=https://...

```

### Installation

```bash
pnpm install
```

## ⚙️ Configuration

### Market Pairs

The project supports multiple market pairs configured in `devtools/config/tokens.ts`:

- **`WETH_USDC`** - WETH/USDC pair (Arbitrum mainnet hub)
- **`WBTC_USDC`** - WBTC/USDC pair (Arbitrum mainnet hub)  
- **`WETH_USDC_SG`** - WETH/USDC Staging (Arbitrum testnet hub)

Each market pair contains:
- **GM Token**: Market token configuration
- **GLV Token**: Liquidity vault token configuration
- **Hub Network**: Primary network with existing token contracts (deploys adapters)
- **Expansion Networks**: Networks where OFT tokens will be deployed

**⚠️ Important**: Do **NOT** include the hub network EID in the expansion networks list. The system automatically validates this and will error if hub networks are found in expansion networks.

### Network Configuration

Network settings are defined in `devtools/config/networks.ts`:

- **Block Confirmations**: Required confirmations per network
- **Ownership Transfer**: Owner addresses for deployed contracts
- **Expansion Networks**: Testnet and mainnet expansion network lists

## 🚀 Deployment

### Quick Start

```bash
# 1. First, validate your configuration
MARKET_PAIR=WETH_USDC npx hardhat validate-config

# 2. Then deploy to all configured networks
MARKET_PAIR=WETH_USDC npx hardhat lz:deploy

# Or deploy to specific networks
MARKET_PAIR=WBTC_USDC npx hardhat deploy --network arbitrum-mainnet --tags GlvToken,MarketToken
```

### Available Commands

```bash
# Always validate first!
MARKET_PAIR=WETH_USDC npx hardhat validate-config

# Deploy all contracts across all networks
MARKET_PAIR=WETH_USDC npx hardhat lz:deploy

# Deploy only GLV tokens
MARKET_PAIR=WETH_USDC npx hardhat deploy --tags GlvToken

# Deploy only GM tokens  
MARKET_PAIR=WBTC_USDC npx hardhat deploy --tags MarketToken

# Deploy to specific network
MARKET_PAIR=WETH_USDC_SG npx hardhat deploy --network sepolia-testnet
```

### Without MARKET_PAIR Environment Variable

If you don't set `MARKET_PAIR`, you'll see available options:

```bash
npx hardhat deploy

# Output:
❌ No MARKET_PAIR environment variable set.

📋 Available market pairs:
   MARKET_PAIR=WETH_USDC     # GMX Liquidity Vault [WETH-USDC]
   MARKET_PAIR=WBTC_USDC     # GMX Liquidity Vault [WBTC-USDC]  
   MARKET_PAIR=WETH_USDC_SG  # GMX Liquidity Vault [WETH-USDC.SG]

💡 Usage examples:
   MARKET_PAIR=WETH_USDC     npx hardhat lz:deploy
   MARKET_PAIR=WBTC_USDC     npx hardhat deploy --network arbitrum-mainnet
```

### Deployment Logic

The deployment system automatically determines:

- **Hub Networks**: Deploy adapters (use existing token contracts)
- **Expansion Networks**: Deploy OFTs (create new bridgeable tokens)
- **Network Filtering**: Only deploys to networks configured for the selected market pair
- **Automatic Skipping**: Skips networks not in the market pair's hub or expansion networks

**Important**: 
- Even if your `hardhat.config.ts` defines 10 networks, if your market pair only configures 3 networks (1 hub + 2 expansion), deployments and wiring will **only** occur on those 3 networks. Other networks are automatically skipped.
- The deploy script deploys **adapters** on hub networks and **OFTs** on expansion networks.
- Hub networks must **NOT** be included in expansion networks - there's automatic validation that prevents this.

### Example Output

```bash
Network: arbitrum-mainnet
EID: 30110
Named Accounts:
  deployerGM : 0x1234...
  deployerGLV: 0x5678...

Deploying GlvToken_Adapter for WETH_USDC
Deployed contract: GlvToken_Adapter, network: arbitrum-mainnet, address: 0x...

Deploying MarketToken_Adapter for WETH_USDC
Deployed contract: MarketToken_Adapter, network: arbitrum-mainnet, address: 0x...

Network: base-mainnet
EID: 30184
Named Accounts:
  deployerGM : 0x1234...
  deployerGLV: 0x5678...

Deploying GlvToken_OFT for WETH_USDC
Deployed contract: GlvToken_OFT, network: base-mainnet, address: 0x...

Deploying MarketToken_OFT for WETH_USDC
Deployed contract: MarketToken_OFT, network: base-mainnet, address: 0x...
```

## 🔗 LayerZero Wiring

### Wire Configuration

After deployment, configure LayerZero connections between networks:

```bash
# Wire testnet contracts
MARKET_PAIR=WETH_USDC_SG npx hardhat lz:oapp:wire --oapp-config layerzero.testnet.config.ts

# Wire mainnet contracts
MARKET_PAIR=WETH_USDC npx hardhat lz:oapp:wire --oapp-config layerzero.mainnet.config.ts
```

**Network Filtering**: Just like deployments, wiring only occurs between networks configured in the market pair's `hubNetwork` and `expansionNetworks`. Networks not configured for the selected market pair are automatically excluded from the wire configuration.

### Wire Configuration Files

- **`layerzero.testnet.config.ts`**: Testnet wiring configuration
- **`layerzero.mainnet.config.ts`**: Mainnet wiring configuration

These files use the wire generator to automatically:
- Create pathways between hub and expansion networks
- Set appropriate enforced options (hub vs spoke)
- Configure DVNs and block confirmations
- Handle ownership transfers

### Wire Generator Features

The wire generator (`devtools/wire/wire-generator.ts`) automatically:

1. **Determines Contract Types**: Adapter for hub networks, OFT for expansion networks
2. **Sets Enforced Options**: Different gas limits for hub vs spoke communications
3. **Creates Full Mesh**: Connects all networks in the expansion list
4. **Validates Configuration**: Ensures hub networks aren't in expansion lists (throws error if found)
5. **Network Filtering**: Only wires networks configured in the market pair (hub + expansion networks)

## ✅ Validation

### Configuration Validation

**⚠️ Always run validation before deployments!** This ensures your configuration matches the actual on-chain token data.

```bash
# Validate all GLV tokens (REQUIRED before deployment)
MARKET_PAIR=WETH_USDC npx hardhat validate-config

# Validate on specific network
MARKET_PAIR=WETH_USDC npx hardhat validate-config --network arbitrum-mainnet
```

### Validation Features

- **Token Name/Symbol Verification**: Compares config vs on-chain data
- **GLV Focus**: Only validates GLV tokens (GM mismatches expected)
- **Decimals Display**: Shows token decimals
- **Network Detection**: Automatically connects to hub networks
- **Table Output**: Clean, formatted results

### Example Validation Output

```
📊 Configuration Validation Results
┌──────────────┬────────────────────────────────────────────┬────────────────────────────────────────┬───────┬────────────────────┬────────────────────┬────────┬──────────┐
│ Market Pair  │ Contract Address                           │ On-Chain Name                          │ Name  │ Config Symbol      │ On-Chain Symbol    │ Symbol │ Decimals │
├──────────────┼────────────────────────────────────────────┼────────────────────────────────────────┼───────┼────────────────────┼────────────────────┼────────┼──────────┤
│ WETH_USDC    │ 0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9 │ GMX Liquidity Vault [WETH-USDC]        │ ✅    │ GLV [WETH-USDC]    │ GLV [WETH-USDC]    │ ✅     │ 18       │
│ WBTC_USDC    │ 0xdF03EEd325b82bC1d4Db8b49c30ecc9E05104b96 │ GMX Liquidity Vault [WBTC-USDC]        │ ✅    │ GLV [WBTC-USDC]    │ GLV [WBTC-USDC]    │ ✅     │ 18       │
└──────────────┴────────────────────────────────────────────┴────────────────────────────────────────┴───────┴────────────────────┴────────────────────┴────────┴──────────┘

📋 Summary:
   GLV tokens validated: 2
   GLV mismatches: 0
   ✅ All GLV tokens match their on-chain counterparts!
```

## 📁 Project Structure

```
├── devtools/                    # 🛠️ Development utilities
│   ├── config/                  # 📊 Configuration data
│   │   ├── networks.ts          # Network settings (confirmations, ownership)
│   │   ├── tokens.ts            # Token configurations (market pairs)
│   │   ├── layerzero.ts         # LayerZero settings (enforced options, DVNs)
│   │   └── index.ts             # Config exports
│   ├── deploy/                  # 🚀 Deployment utilities
│   │   ├── utils.ts             # Deploy helper functions
│   │   └── index.ts
│   ├── wire/                    # 🔗 LayerZero wire generation
│   │   ├── wire-generator.ts    # Wire configuration generator
│   │   ├── config.ts            # Wire-specific configs
│   │   └── index.ts
│   ├── types.ts                 # 📋 TypeScript interfaces
│   └── index.ts                 # Main devtools export
├── deploy/                      # 📦 Hardhat deployment scripts
│   ├── GlvToken.ts              # GLV token deployment
│   └── MarketToken.ts           # GM token deployment
├── tasks/                       # ⚙️ Custom Hardhat tasks
│   └── validate-config.ts       # Configuration validation task
├── layerzero.testnet.config.ts  # 🔗 Testnet LayerZero wiring
├── layerzero.mainnet.config.ts  # 🔗 Mainnet LayerZero wiring
└── hardhat.config.ts            # ⚙️ Hardhat configuration
```

## 🔧 Advanced Usage

### Adding New Market Pairs

1. Add configuration to `devtools/config/tokens.ts`:

```typescript
const NEW_PAIR: MarketPairConfig = {
    GM: {
        tokenName: 'GM NEW-PAIR',
        tokenSymbol: 'GM NEW-PAIR',
        hubNetwork: {
            eid: EndpointId.ARBITRUM_V2_MAINNET,
            contractAddress: '0x...',
        },
        expansionNetworks: ExpansionNetworks.mainnet,
    },
    GLV: {
        tokenName: 'GMX Liquidity Vault [NEW-PAIR]',
        tokenSymbol: 'GLV [NEW-PAIR]',
        hubNetwork: {
            eid: EndpointId.ARBITRUM_V2_MAINNET,
            contractAddress: '0x...',
        },
        expansionNetworks: ExpansionNetworks.mainnet,
    },
}

export const Tokens: Config = {
    // ... existing pairs
    NEW_PAIR,
}
```

2. Deploy with new market pair:

```bash
MARKET_PAIR=NEW_PAIR npx hardhat lz:deploy
```

### Adding New Networks

1. Update `devtools/config/networks.ts`:

```typescript
export const BlockConfirmations: Partial<Record<EndpointId, number>> = {
    // ... existing networks
    [EndpointId.NEW_NETWORK]: 10,
}

export const OwnershipTransfer: Partial<Record<EndpointId, string>> = {
    // ... existing networks
    [EndpointId.NEW_NETWORK]: '0x...',
}

export const ExpansionNetworks = {
    mainnet: [
        // ... existing networks
        EndpointId.NEW_NETWORK,
    ],
}
```

2. Update `hardhat.config.ts`:

```typescript
networks: {
    // ... existing networks
    'new-network': {
        eid: EndpointId.NEW_NETWORK,
        url: process.env.RPC_URL_NEW_NETWORK,
        accounts,
    },
}
```

## 🛠️ Development

### Key Components

- **`devtools/`**: All development utilities and configurations
- **`deploy/`**: Hardhat deployment scripts for contracts
- **`tasks/`**: Custom Hardhat tasks for validation and utilities
- **LayerZero configs**: Wire configuration for cross-chain connectivity

### Deployment Flow

1. **Configuration**: Select market pair via `MARKET_PAIR` env var
2. **Network Detection**: Automatically determine hub vs expansion networks
3. **Contract Deployment**: Deploy adapters on hub, OFTs on expansion networks
4. **Validation**: Verify deployed contracts match configuration
5. **Wiring**: Configure LayerZero pathways between networks

### Wire Generation

The wire generator automatically:
- Creates contracts for all configured networks
- Determines adapter vs OFT based on hub network
- Sets appropriate enforced options for hub/spoke communication
- Generates full mesh connectivity between all networks

## 🎯 Common Workflows

### Deploy New Market Pair

```bash
# 1. Add configuration to devtools/config/tokens.ts

# 2. Validate configuration first
MARKET_PAIR=NEW_PAIR npx hardhat validate-config

# 3. Deploy contracts
MARKET_PAIR=NEW_PAIR npx hardhat lz:deploy

# 4. Wire LayerZero connections
MARKET_PAIR=NEW_PAIR npx hardhat lz:oapp:wire --oapp-config layerzero.mainnet.config.ts
```

### Update Existing Configuration

```bash
# 1. Update devtools/config/tokens.ts

# 2. Validate changes first
MARKET_PAIR=UPDATED_PAIR npx hardhat validate-config

# 3. Redeploy if needed
MARKET_PAIR=UPDATED_PAIR npx hardhat lz:deploy
```

### Add New Network

```bash
# 1. Update devtools/config/networks.ts
# 2. Update hardhat.config.ts
# 3. Deploy to new network
MARKET_PAIR=WETH_USDC npx hardhat deploy --network new-network

# 4. Update wire configuration
MARKET_PAIR=WETH_USDC npx hardhat lz:oapp:wire --oapp-config layerzero.mainnet.config.ts
```

## 🔍 Troubleshooting

### Common Issues

1. **Missing MARKET_PAIR**: Set the environment variable or see available options
2. **Network Not Configured**: Check if network is in expansion networks list
3. **Validation Failures**: Verify on-chain token data matches configuration
4. **Hub in Expansion Networks**: Hub network EID found in expansion networks (validation error)
5. **Wire Conflicts**: Ensure hub networks aren't in expansion network lists

### Validation Error Example

```bash
❌ Configuration validation failed:
   GLV hub network (EID: 30110) should not be in GLV expansion networks
Error: Hub networks found in expansion networks. This is not allowed.
```

**Fix**: Remove the hub network EID from the expansion networks array in your token configuration.

### Debug Commands

```bash
# Check available market pairs
npx hardhat deploy

# Validate configuration
npx hardhat validate-config

# Check network connectivity
npx hardhat node --network arbitrum-mainnet
```

## 📚 API Reference

### Key Functions

- **`getDeployConfig()`**: Gets market pair configuration from environment
- **`generateWireConfig()`**: Creates LayerZero wire configuration
- **`validateHubNetworksNotInExpansion()`**: Validates configuration integrity
- **`shouldDeployToNetwork()`**: Determines if network should be deployed to

### Configuration Types

- **`MarketPairConfig`**: Complete market pair with GM and GLV tokens
- **`TokenConfig`**: Individual token configuration
- **`HubNetwork`**: Hub network with EID and contract address
- **`DeployConfig`**: Runtime deployment configuration

## 🤝 Contributing

1. Follow the established patterns in `devtools/`
2. Add proper TypeScript types for new features
3. Update this README for new functionality
4. Test deployments on testnet before mainnet

## 📄 License

[Add your license information here]