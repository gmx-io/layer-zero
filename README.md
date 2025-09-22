# GMX Liquidity Vault (GLV) & GM Token Deployment

This project provides a comprehensive deployment and configuration system for GMX Liquidity Vault (GLV) and GM tokens across multiple blockchain networks using LayerZero's OmniChain technology.

## Table of Contents

- [Setup](#setup)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [LayerZero Wiring](#layerzero-wiring)
- [Enhanced Task Commands](#enhanced-task-commands)
- [Validation](#validation)
- [Project Structure](#project-structure)

## Setup

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

# Mainnet RPCs (else we fallback to defaults in hardhat.config.ts)
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

## Configuration

### Market Pairs

The project supports multiple market pairs configured in `devtools/config/tokens.ts`:

- **`WETH_USDC`** - WETH/USDC pair (Arbitrum mainnet hub)
- **`WBTC_USDC`** - WBTC/USDC pair (Arbitrum mainnet hub)
- **`WETH_USDC_SG`** - WETH/USDC pair (Arbitrum testnet hub)

Each market pair contains:

- **GM Token**: Market token configuration
- **GLV Token**: Liquidity vault token configuration
- **Hub Network**: Primary network with existing token contracts (deploys adapters)
- **Expansion Networks**: Networks where OFT tokens will be deployed

**⚠️ Important**: Do **NOT** include the hub network EID in the expansion networks list. The system automatically validates this and will error if hub networks are found in expansion networks.

**⚠️ Important**: It is possible for the GM and GLV tokens to be deployed on different meshes for the same gm/glv pair.

### Network Configuration

Network settings are defined in `devtools/config/networks.ts`:

- **Block Confirmations**: Required confirmations per network
- **Ownership Transfer**: Owner addresses for deployed contracts
- **Expansion Networks**: Testnet and mainnet expansion network lists

## Deployment

### Quick Start

```bash
# 1. First, validate your configuration
npx hardhat lz:sdk:validate-config

# 2. Deploy all contracts to mainnet networks
npx hardhat lz:sdk:deploy --stage mainnet --market-pair WETH_USDC

# Or deploy to testnet networks
npx hardhat lz:sdk:deploy --stage testnet --market-pair WETH_USDC_SG
```

### Available Commands

The commands that were created for this project are prefixed with `lz:sdk`

```bash
# Always validate first!
npx hardhat lz:sdk:validate-config

# Deploy contracts
npx hardhat lz:sdk:deploy \
  [--stage <mainnet|testnet>=mainnet] \
  --market-pair <MARKET_PAIR> \
  [--token-type <GM|GLV>=both] \ # both is not an option it is used to indicate that both are used
  [--networks <NETWORK1,NETWORK2,...>] # optional argument to filter networks
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

## LayerZero Wiring

### Wire Configuration

After deployment, configure LayerZero connections between networks using the enhanced wrapper tasks:

```bash
# Wire LayerZero contracts
npx hardhat lz:sdk:wire \
  [--stage <mainnet|testnet>=mainnet] \
  --market-pair <MARKET_PAIR> \
  [--token-type <GM|GLV>=both] \
  [--signer <ADDRESS>] \          # when tokenType specified
  [--gm-signer <ADDRESS>] \        # when tokenType=both (GM signer)
  [--glv-signer <ADDRESS>] \       # when tokenType=both (GLV signer)
  [--skip-delegate] \
  [--generate-payloads] \
  [--dryRun] \
  [--ci]
```

**Network Filtering**: Just like deployments, wiring only occurs between networks configured in the market pair's `hubNetwork` and `expansionNetworks`. Networks not configured for the selected market pair are automatically excluded from the wire configuration.

### Automatic Features

- **Signer Detection**: Automatically uses the correct deployer (`deployerGM` or `deployerGLV`) from your Hardhat configuration
- **Config Selection**: Automatically selects the correct LayerZero config file based on token type and stage

## Enhanced Task Commands

The project includes enhanced Hardhat tasks that simplify deployment and wiring operations with better logging and streamlined workflows.

### Deployment Tasks

#### Deploy (Base Command)

```bash
# Deploy contracts
npx hardhat lz:sdk:deploy \
  [--stage <mainnet|testnet>=mainnet] \
  --market-pair <MARKET_PAIR> \
  [--token-type <GM|GLV>=both] \
  [--networks <NETWORK1,NETWORK2,...>] \
  [--tags <TAG1,TAG2,...>] \
  [--reset] \
  [--ci] \
  [--log-level <error|warn|info|verbose|debug>=info]

# Examples
npx hardhat lz:sdk:deploy --market-pair WETH_USDC --stage mainnet
npx hardhat lz:sdk:deploy --market-pair WBTC_USDC --token-type GM --networks arbitrum-mainnet,base-mainnet
```

#### Deploy Examples by Stage

```bash
# Deploy all contracts to mainnet networks
npx hardhat lz:sdk:deploy --market-pair WETH_USDC

# Deploy all contracts to testnet networks
npx hardhat lz:sdk:deploy --stage testnet --market-pair WETH_USDC_SG

# Deploy only GM contracts to mainnet
npx hardhat lz:sdk:deploy [--stage mainnet] --market-pair WETH_USDC --token-type GM

```

### Wiring Tasks

#### Wire (Unified Command)

```bash
# Examples
npx hardhat lz:sdk:wire --market-pair WETH_USDC --token-type GM --signer 0x1234...
npx hardhat lz:sdk:wire --market-pair WETH_USDC --gm-signer 0x1111... --glv-signer 0x2222...
npx hardhat lz:sdk:wire --market-pair WETH_USDC --generate-payloads
npx hardhat lz:sdk:wire --market-pair WETH_USDC --dryRun
```

### Ownership Transfer Tasks

#### Transfer Ownership (Unified Command)

```bash
# Examples
npx hardhat lz:sdk:transfer-ownership --market-pair WETH_USDC --token-type GM --signer 0x1234...
npx hardhat lz:sdk:transfer-ownership --market-pair WETH_USDC --gm-signer 0x1111... --glv-signer 0x2222...
npx hardhat lz:sdk:transfer-ownership --market-pair WETH_USDC --safe
npx hardhat lz:sdk:transfer-ownership --market-pair WETH_USDC --dry-run
```

### Management Tasks

#### Display Deployments

```bash
# Show all deployed contracts grouped by market pair
npx hardhat lz:sdk:display-deployments

# Show only mainnet deployments
npx hardhat lz:sdk:display-deployments --mainnet

# Filter by specific network
npx hardhat lz:sdk:display-deployments --filter-networks arbitrum-mainnet
```

#### Validate Deployments

```bash
# Validate all LayerZero deployments by testing quoteSend() calls
npx hardhat lz:sdk:validate-deployments

# Validate only mainnet deployments
npx hardhat lz:sdk:validate-deployments --mainnet

# Validate specific market pair
npx hardhat lz:sdk:validate-deployments --market-pair WETH_USDC

# Validate specific network
npx hardhat lz:sdk:validate-deployments --token-type GLV --filter-networks arbitrum-mainnet,base-mainnet --mainnet
```

#### Validate Configuration

```bash
# Validate token configuration against on-chain data
npx hardhat lz:sdk:validate-config
```

### Signer Management

The enhanced tasks automatically detect signers from Hardhat's named accounts configuration. However, you can override this behavior:

#### Automatic Signer Detection

- **GM contracts**: Uses `deployerGM` from named accounts
- **GLV contracts**: Uses `deployerGLV` from named accounts
- **Fallback**: Manual signer specification via `--signer` flag

#### Manual Signer Override

```bash
# Use specific signer address (overrides automatic detection)
npx hardhat lz:sdk:wire --market-pair WETH_USDC --token-type GM --signer 0x1234567890123456789012345678901234567890
```

#### Payload Generation for Multisig

When generating payloads for multisig execution, the specific private key doesn't matter since transactions aren't executed:

```bash
# Generate payloads with any valid address (private key not used)
npx hardhat lz:sdk:wire --market-pair WETH_USDC --token-type GM --generate-payloads --signer 0x0000000000000000000000000000000000000001

# Or use automatic detection (will generate payloads but not execute)
npx hardhat lz:sdk:wire --market-pair WETH_USDC --token-type GM --generate-payloads

# Generate payloads for both GM and GLV
npx hardhat lz:sdk:wire --market-pair WETH_USDC --generate-payloads
```

**💡 Tip**: For payload generation, you can use any ethereum address since they are not part of the payloads (--skip-delegate is ignored since there is no msg.sender)

### Wire Configuration Files

- **`layerzero.<gm|glv>.testnet.config.ts`**: Testnet wiring configuration
- **`layerzero.<gm|glv>.mainnet.config.ts`**: Mainnet wiring configuration

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

## Validation

### Configuration Validation

**⚠️ Always run validation before deployments!** This ensures your configuration matches the actual on-chain token data.

```bash
# Validate all GLV tokens (REQUIRED before deployment)
npx hardhat lz:sdk:validate-config

# Validate on specific network
npx hardhat lz:sdk:validate-config --network arbitrum-mainnet
```

### Deployment Validation

After deployment, validate that LayerZero wiring is working correctly:

```bash
# Validate all deployments by testing cross-chain quoteSend() calls
npx hardhat lz:sdk:validate-deployments

# Validate only mainnet deployments
npx hardhat lz:sdk:validate-deployments --mainnet

# Validate specific market pair
npx hardhat lz:sdk:validate-deployments --market-pair WETH_USDC

# Display deployed contracts grouped by market pair
npx hardhat lz:sdk:display-deployments
```

## Project Structure

```
├── devtools/                    # Development utilities
│   ├── config/                  # Configuration data
│   │   ├── networks.ts          # Network settings (confirmations, ownership)
│   │   ├── tokens.ts            # Token configurations (market pairs)
│   │   ├── layerzero.ts         # LayerZero settings (enforced options, DVNs)
│   │   └── index.ts             # Config exports
│   ├── deploy/                  # Deployment utilities
│   │   ├── utils.ts             # Deploy helper functions
│   │   └── index.ts
│   ├── wire/                    # LayerZero wire generation
│   │   ├── wire-generator.ts    # Wire configuration generator
│   │   ├── config.ts            # Wire-specific configs
│   │   └── index.ts
│   ├── types.ts                 # TypeScript interfaces
│   └── index.ts                 # Main devtools export
├── deploy/                      # Hardhat deployment scripts
│   ├── GlvToken.ts              # GLV token deployment
│   └── MarketToken.ts           # GM token deployment
├── tasks/                       # Enhanced Hardhat tasks (lz:sdk:* commands)
│   ├── deploy-wrapper.ts        # Enhanced deploy command
│   ├── wire-wrapper.ts          # Enhanced wire command
│   ├── ownership-wrapper.ts     # Enhanced ownership transfer command
│   ├── validate-deployments.ts  # Deployment validation with quoteSend testing
│   ├── validate-config.ts       # Configuration validation
│   ├── display-deployments.ts   # Deployment display utilities
│   ├── vape-send-tokens.ts      # Token sending utilities
│   └── index.ts                 # Task exports
├── payloads/                    # Generated transaction payloads (created automatically)
│   └── wire-payloads-*.json     # Multisig transaction payloads
├── deployments/                 # Hardhat deployment artifacts
│   ├── arbitrum-mainnet/        # Network-specific deployments
│   ├── base-mainnet/
│   └── ...                      # Other networks
├── layerzero.gm.mainnet.config.ts    # GM mainnet LayerZero configuration
├── layerzero.gm.testnet.config.ts    # GM testnet LayerZero configuration
├── layerzero.glv.mainnet.config.ts   # GLV mainnet LayerZero configuration
├── layerzero.glv.testnet.config.ts   # GLV testnet LayerZero configuration
└── hardhat.config.ts                 # Hardhat configuration with named accounts
```

## Advanced Usage

### Adding New Market Pairs

1. Add configuration to `devtools/config/tokens.ts`:

```typescript
const NEW_PAIR: MarketPairConfig = {
  GM: {
    tokenName: "GM NEW-PAIR",
    tokenSymbol: "GM NEW-PAIR",
    hubNetwork: {
      eid: EndpointId.ARBITRUM_V2_MAINNET,
      contractAddress: "0x...",
    },
    expansionNetworks: ExpansionNetworks.mainnet,
  },
  GLV: {
    tokenName: "GMX Liquidity Vault [NEW-PAIR]",
    tokenSymbol: "GLV [NEW-PAIR]",
    hubNetwork: {
      eid: EndpointId.ARBITRUM_V2_MAINNET,
      contractAddress: "0x...",
    },
    expansionNetworks: ExpansionNetworks.mainnet,
  },
};

export const Tokens: Config = {
  // ... existing pairs
  NEW_PAIR,
};
```

2. Deploy with new market pair:

```bash
npx hardhat lz:sdk:deploy --market-pair WETH_USDC
```

### Adding New Networks

1. Update `devtools/config/networks.ts`:

```typescript
export const BlockConfirmations: Partial<Record<EndpointId, number>> = {
  // ... existing networks
  [EndpointId.NEW_NETWORK]: 10,
};

export const OwnershipTransfer: Partial<Record<EndpointId, string>> = {
  // ... existing networks
  [EndpointId.NEW_NETWORK]: "0x...",
};

export const ExpansionNetworks = {
  mainnet: [
    // ... existing networks
    EndpointId.NEW_NETWORK,
  ],
};
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

## Development

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

## Common Workflows

### Deploy New Market Pair

```bash
# 1. Add configuration to devtools/config/tokens.ts

# 2. Validate configuration first
npx hardhat lz:sdk:validate-config

# 3. Deploy contracts to mainnet
npx hardhat lz:sdk:deploy --stage mainnet --market-pair NEW_PAIR

# 4. Wire LayerZero connections
npx hardhat lz:sdk:wire --market-pair NEW_PAIR

# 5. Validate deployments
npx hardhat lz:sdk:validate-deployments --market-pair NEW_PAIR
```

### Update Existing Configuration

```bash
# 1. Update devtools/config/tokens.ts

# 2. Validate changes first
npx hardhat lz:sdk:validate-config

# 3. Redeploy if needed
npx hardhat lz:sdk:deploy --stage mainnet --market-pair UPDATED_PAIR

# 4. Rewire connections
npx hardhat lz:sdk:wire --market-pair UPDATED_PAIR
```

### Deploy Only Specific Token Type

```bash
# Deploy only GM contracts
npx hardhat lz:sdk:deploy --stage mainnet --market-pair WETH_USDC --token-type GM

# Wire only GM contracts
npx hardhat lz:sdk:wire --market-pair WETH_USDC --token-type GM

# Validate only GM deployments
npx hardhat lz:sdk:validate-deployments --market-pair WETH_USDC --token-type GM
```

### Add New Network

```bash
# 1. Update devtools/config/networks.ts
# 2. Update hardhat.config.ts
# 3. Deploy to all networks (including new one)
npx hardhat lz:sdk:deploy --stage mainnet --market-pair WETH_USDC

# 4. Wire all connections (including new network)
npx hardhat lz:sdk:wire --market-pair WETH_USDC
```

### Verify Contracts

Two methods to verify contracts are available.

#### Standard JSON Files

Manually verify contract in block explorers by generating standard JSON files (https://docs.soliditylang.org/en/latest/using-the-compiler.html#compiler-api).

```bash
pnpm ts-node scripts/standard-json-generator.ts
```

#### Hardhat Verify

Use Hardhat verification plugin.

```bash
pnpm ts-node scripts/verify-contracts.ts botanix-mainnet
```

Optionally, pass the `--force` flag to force re-verification for already verified contracts through partial matches.

```bash
pnpm ts-node scripts/verify-contracts.ts botanix-mainnet --force
```

## Troubleshooting

### Common Issues

1. **Missing Market Pair**: Specify `--market-pair` parameter in your command
2. **Network Not Configured**: Check if network is in expansion networks list
3. **Validation Failures**: Verify on-chain token data matches configuration
4. **Hub in Expansion Networks**: Hub network EID found in expansion networks (validation error)
5. **Wire Conflicts**: Ensure hub networks aren't in expansion network lists
6. **Signer Not Found**: Ensure `deployerGM` and `deployerGLV` are configured in your Hardhat named accounts

### Validation Error Example

```bash
❌ Configuration validation failed:
   GLV hub network (EID: 30110) should not be in GLV expansion networks
Error: Hub networks found in expansion networks. This is not allowed.
```

**Fix**: Remove the hub network EID from the expansion networks array in your token configuration.

### Debug Commands

```bash
# Display all deployed contracts
npx hardhat lz:sdk:display-deployments

# Validate configuration
npx hardhat lz:sdk:validate-config

# Validate deployments
npx hardhat lz:sdk:validate-deployments

# Check network connectivity
npx hardhat lz:healthcheck:validate:rpcs
```

## Reference

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
