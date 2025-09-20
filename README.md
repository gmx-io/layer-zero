# GMX Liquidity Vault (GLV) & GM Token Deployment

This project provides a comprehensive deployment and configuration system for GMX Liquidity Vault (GLV) and GM tokens across multiple blockchain networks using LayerZero's OmniChain technology.

## 📋 Table of Contents

- [Setup](#setup)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [LayerZero Wiring](#layerzero-wiring)
- [Enhanced Task Commands](#enhanced-task-commands)
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
npx hardhat lz:sdk:validate-config

# 2. Deploy all contracts to mainnet networks
npx hardhat lz:sdk:deploy --stage mainnet --marketPair WETH_USDC

# Or deploy to testnet networks
npx hardhat lz:sdk:deploy --stage testnet --marketPair WETH_USDC_SG
```

### Available Commands

```bash
# Always validate first!
npx hardhat lz:sdk:validate-config

# Deploy all contracts to mainnet networks
npx hardhat lz:sdk:deploy --stage mainnet --marketPair WETH_USDC

# Deploy only GM contracts to mainnet
npx hardhat lz:sdk:deploy --stage mainnet --marketPair WETH_USDC --tokenType GM

# Deploy only GLV contracts to mainnet
npx hardhat lz:sdk:deploy --stage mainnet --marketPair WBTC_USDC --tokenType GLV

# Deploy all contracts to testnet networks
npx hardhat lz:sdk:deploy --stage testnet --marketPair WETH_USDC_SG

# Deploy with advanced options using the base wrapper
npx hardhat lz:sdk:deploy --marketPair WETH_USDC --stage mainnet --networks "arbitrum-mainnet,base-mainnet"
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

After deployment, configure LayerZero connections between networks using the enhanced wrapper tasks:

```bash
# Wire both GM and GLV contracts for a market pair
npx hardhat lz:sdk:wire --marketPair WETH_USDC

# Wire only GM contracts
npx hardhat lz:sdk:wire --marketPair WETH_USDC --tokenType GM

# Wire only GLV contracts
npx hardhat lz:sdk:wire --marketPair WETH_USDC --tokenType GLV

# Wire with ownership delegation
npx hardhat lz:sdk:wire --marketPair WETH_USDC --tokenType GLV --setDelegate

# Generate transaction payloads for multisig execution
npx hardhat lz:sdk:wire --marketPair WETH_USDC --tokenType GM --generatePayloads
```

**Network Filtering**: Just like deployments, wiring only occurs between networks configured in the market pair's `hubNetwork` and `expansionNetworks`. Networks not configured for the selected market pair are automatically excluded from the wire configuration.

### Automatic Features

- **Signer Detection**: Automatically uses the correct deployer (`deployerGM` or `deployerGLV`) from your Hardhat configuration
- **Config Selection**: Automatically selects the correct LayerZero config file based on token type
- **Market Pair Handling**: No need to set environment variables - specify everything via CLI flags

## 🔧 Enhanced Task Commands

The project includes enhanced Hardhat tasks that simplify deployment and wiring operations with better logging and streamlined workflows.

### 🚀 Deployment Tasks

#### Deploy (Base Command)

```bash
# Deploy with automatic market pair handling
npx hardhat lz:sdk:deploy --marketPair WETH_USDC --stage mainnet

# Deploy specific token type with tags
npx hardhat lz:sdk:deploy --marketPair WBTC_USDC --stage mainnet --tags MarketToken

# Deploy to specific networks
npx hardhat lz:sdk:deploy --marketPair WETH_USDC --networks "arbitrum-mainnet,base-mainnet" --stage mainnet

# Deploy with logging level
npx hardhat lz:sdk:deploy --marketPair WETH_USDC --stage mainnet --logLevel debug
```

#### Deploy Examples by Stage

```bash
# Deploy all contracts to mainnet networks
npx hardhat lz:sdk:deploy --stage mainnet --marketPair WETH_USDC

# Deploy all contracts to testnet networks
npx hardhat lz:sdk:deploy --stage testnet --marketPair WETH_USDC_SG

# Deploy only GM contracts to mainnet
npx hardhat lz:sdk:deploy --stage mainnet --marketPair WETH_USDC --tokenType GM

# Deploy only GLV contracts to testnet
npx hardhat lz:sdk:deploy --stage testnet --marketPair WETH_USDC_SG --tokenType GLV

# Deploy with reset (delete existing deployments)
npx hardhat lz:sdk:deploy --stage mainnet --marketPair WETH_USDC --reset

# Deploy in CI mode (non-interactive)
npx hardhat lz:sdk:deploy --stage mainnet --marketPair WETH_USDC --ci
```

### 🔗 Wiring Tasks

#### Wire (Unified Command)

```bash
# Wire both GM and GLV contracts with automatic signer detection
npx hardhat lz:sdk:wire --marketPair WETH_USDC

# Wire only GM contracts
npx hardhat lz:sdk:wire --marketPair WETH_USDC --tokenType GM

# Wire only GLV contracts
npx hardhat lz:sdk:wire --marketPair WETH_USDC --tokenType GLV

# Wire with custom signer (overrides automatic detection)
npx hardhat lz:sdk:wire --marketPair WETH_USDC --tokenType GM --signer 0x1234567890123456789012345678901234567890

# Wire both types with separate signers for GM and GLV
npx hardhat lz:sdk:wire --marketPair WETH_USDC --gmSigner 0x1111... --glvSigner 0x2222...

# Wire with fallback signer for both types
npx hardhat lz:sdk:wire --marketPair WETH_USDC --signer 0x3333...

# Wire with ownership delegation
npx hardhat lz:sdk:wire --marketPair WETH_USDC --tokenType GLV --setDelegate

# Generate transaction payloads for review (useful for multisig)
npx hardhat lz:sdk:wire --marketPair WETH_USDC --tokenType GM --generatePayloads

# Dry run (simulate without executing)
npx hardhat lz:sdk:wire --marketPair WETH_USDC --tokenType GM --dryRun

# Wire with custom logging level
npx hardhat lz:sdk:wire --marketPair WETH_USDC --tokenType GM --logLevel verbose

# Wire both with delegation and payload generation
npx hardhat lz:sdk:wire --marketPair WETH_USDC --setDelegate --generatePayloads

# Wire both in CI mode
npx hardhat lz:sdk:wire --marketPair WETH_USDC --ci
```

### 🔐 Ownership Transfer Tasks

#### Transfer Ownership (Unified Command)

```bash
# Transfer ownership for both GM and GLV contracts
npx hardhat lz:sdk:transfer-ownership --market-pair WETH_USDC

# Transfer ownership for only GM contracts
npx hardhat lz:sdk:transfer-ownership --market-pair WETH_USDC --token-type GM

# Transfer ownership for only GLV contracts
npx hardhat lz:sdk:transfer-ownership --market-pair WETH_USDC --token-type GLV

# Transfer ownership with custom signer (overrides automatic detection)
npx hardhat lz:sdk:transfer-ownership --market-pair WETH_USDC --token-type GM --signer 0x1234567890123456789012345678901234567890

# Transfer ownership with separate signers for GM and GLV
npx hardhat lz:sdk:transfer-ownership --market-pair WETH_USDC --gm-signer 0x1111... --glv-signer 0x2222...

# Transfer ownership using Gnosis Safe
npx hardhat lz:sdk:transfer-ownership --market-pair WETH_USDC --safe

# Dry run (simulate without executing)
npx hardhat lz:sdk:transfer-ownership --market-pair WETH_USDC --dry-run

# Assert mode (fail if transactions are required)
npx hardhat lz:sdk:transfer-ownership --market-pair WETH_USDC --assert

# Transfer ownership in CI mode
npx hardhat lz:sdk:transfer-ownership --market-pair WETH_USDC --ci

# Transfer ownership with custom logging level
npx hardhat lz:sdk:transfer-ownership --market-pair WETH_USDC --log-level verbose
```

### 📊 Management Tasks

#### Display Deployments

```bash
# Show all deployed contracts grouped by market pair
npx hardhat lz:sdk:display-deployments

# Show only mainnet deployments
npx hardhat lz:sdk:display-deployments --mainnet

# Show only testnet deployments
npx hardhat lz:sdk:display-deployments --testnet

# Filter by specific network
npx hardhat lz:sdk:display-deployments --filterNetworks arbitrum-mainnet
```

#### Validate Deployments

```bash
# Validate all LayerZero deployments by testing quoteSend() calls
npx hardhat lz:sdk:validate-deployments

# Validate only mainnet deployments
npx hardhat lz:sdk:validate-deployments --mainnet

# Validate only testnet deployments
npx hardhat lz:sdk:validate-deployments --testnet

# Validate specific market pair
npx hardhat lz:sdk:validate-deployments --marketPair WETH_USDC

# Validate specific token type
npx hardhat lz:sdk:validate-deployments --tokenType GLV

# Validate specific network
npx hardhat lz:sdk:validate-deployments --filterNetworks arbitrum-mainnet
```

#### Validate Configuration

```bash
# Validate token configuration against on-chain data
npx hardhat lz:sdk:validate-config
```

### 🔐 Signer Management

The enhanced tasks automatically detect signers from Hardhat's named accounts configuration. However, you can override this behavior:

#### Automatic Signer Detection

- **GM contracts**: Uses `deployerGM` from named accounts
- **GLV contracts**: Uses `deployerGLV` from named accounts
- **Fallback**: Manual signer specification via `--signer` flag

#### Manual Signer Override

```bash
# Use specific signer address (overrides automatic detection)
npx hardhat lz:sdk:wire --marketPair WETH_USDC --tokenType GM --signer 0x1234567890123456789012345678901234567890
```

#### Payload Generation for Multisig

When generating payloads for multisig execution, the specific private key doesn't matter since transactions aren't executed:

```bash
# Generate payloads with any valid address (private key not used)
npx hardhat lz:sdk:wire --marketPair WETH_USDC --tokenType GM --generatePayloads --signer 0x0000000000000000000000000000000000000001

# Or use automatic detection (will generate payloads but not execute)
npx hardhat lz:sdk:wire --marketPair WETH_USDC --tokenType GM --generatePayloads

# Generate payloads for both GM and GLV
npx hardhat lz:sdk:wire --marketPair WETH_USDC --generatePayloads
```

**💡 Tip**: For payload generation, you can use any valid Ethereum address as the signer since the private key is not needed for transaction simulation. The generated JSON files contain the transaction data for manual execution or multisig proposals.

### 📝 Task Output Examples

#### Deploy Task Output

```
info:    [deploy-wrapper] Deploying contracts for market pair: WETH_USDC
info:    [deploy-wrapper] Stage: mainnet
info:    [deploy-wrapper] Tags: MarketToken
info:    [deploy-wrapper] Executing deploy command...
info:    [deploy-wrapper] ✅ Deploy command completed successfully!
```

#### Wire Task Output

```
info:    [wire] Wiring all contracts for WETH_USDC
info:    [wire] Wiring GM contracts for WETH_USDC
info:    [wire] Config: layerzero.gm.mainnet.config.ts
info:    [wire] Signer: 0x1234567890123456789012345678901234567890
info:    [wire] Delegate: Yes
info:    [wire] Payloads will be saved to: wire-payloads-WETH_USDC-GM-delegated-2024-03-15T10-30-45.json
info:    [wire] Executing wire command...
info:    [wire] ✅ Wire command completed successfully!
info:    [wire] Wiring GLV contracts for WETH_USDC
info:    [wire] Config: layerzero.glv.mainnet.config.ts
info:    [wire] Signer: 0x5678901234567890123456789012345678901234
info:    [wire] Delegate: Yes
info:    [wire] Executing wire command...
info:    [wire] ✅ Wire command completed successfully!
info:    [wire] ✅ All wiring completed successfully!
```

#### Ownership Transfer Task Output

```
info:    [transfer-ownership] Transferring ownership for all contracts for WETH_USDC
info:    [transfer-ownership] Transferring ownership for GM contracts for WETH_USDC
info:    [transfer-ownership] Config: layerzero.gm.mainnet.config.ts
info:    [transfer-ownership] Signer: 0x1234567890123456789012345678901234567890
info:    [transfer-ownership] Safe: No
info:    [transfer-ownership] Executing ownership transfer command...
info:    [transfer-ownership] ✅ Ownership transfer completed successfully!
info:    [transfer-ownership] Transferring ownership for GLV contracts for WETH_USDC
info:    [transfer-ownership] Config: layerzero.glv.mainnet.config.ts
info:    [transfer-ownership] Signer: 0x5678901234567890123456789012345678901234
info:    [transfer-ownership] Safe: No
info:    [transfer-ownership] Executing ownership transfer command...
info:    [transfer-ownership] ✅ Ownership transfer completed successfully!
info:    [transfer-ownership] ✅ All ownership transfers completed successfully!
```

#### Display Deployments Output

```
Deployed Contracts by Market Pair

1. WETH-USDC
   GM Tokens:
     arbitrum-mainnet: 0x1234... (Adapter)
     base-mainnet: 0x5678... (OFT)
     bsc-mainnet: 0x9ABC... (OFT)
   GLV Tokens:
     arbitrum-mainnet: 0xDEF0... (Adapter)
     base-mainnet: 0x1357... (OFT)
     bsc-mainnet: 0x2468... (OFT)

2. WBTC-USDC
   GM Tokens:
     arbitrum-mainnet: 0xACE1... (Adapter)
     base-mainnet: 0xBEEF... (OFT)
   GLV Tokens:
     arbitrum-mainnet: 0xCAFE... (Adapter)
     base-mainnet: 0xDEAD... (OFT)

Summary: 2 market pairs, 8 contracts
```

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
npx hardhat lz:sdk:validate-deployments --marketPair WETH_USDC

# Display deployed contracts grouped by market pair
npx hardhat lz:sdk:display-deployments
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
MARKET_PAIR=NEW_PAIR npx hardhat lz:deploy
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
npx hardhat lz:sdk:validate-config

# 3. Deploy contracts to mainnet
npx hardhat lz:sdk:deploy --stage mainnet --marketPair NEW_PAIR

# 4. Wire LayerZero connections
npx hardhat lz:sdk:wire --marketPair NEW_PAIR

# 5. Validate deployments
npx hardhat lz:sdk:validate-deployments --marketPair NEW_PAIR
```

### Update Existing Configuration

```bash
# 1. Update devtools/config/tokens.ts

# 2. Validate changes first
npx hardhat lz:sdk:validate-config

# 3. Redeploy if needed
npx hardhat lz:sdk:deploy --stage mainnet --marketPair UPDATED_PAIR

# 4. Rewire connections
npx hardhat lz:sdk:wire --marketPair UPDATED_PAIR
```

### Deploy Only Specific Token Type

```bash
# Deploy only GM contracts
npx hardhat lz:sdk:deploy --stage mainnet --marketPair WETH_USDC --tokenType GM

# Wire only GM contracts
npx hardhat lz:sdk:wire --marketPair WETH_USDC --tokenType GM

# Validate only GM deployments
npx hardhat lz:sdk:validate-deployments --marketPair WETH_USDC --tokenType GM
```

### Add New Network

```bash
# 1. Update devtools/config/networks.ts
# 2. Update hardhat.config.ts
# 3. Deploy to all networks (including new one)
npx hardhat lz:sdk:deploy --stage mainnet --marketPair WETH_USDC

# 4. Wire all connections (including new network)
npx hardhat lz:sdk:wire --marketPair WETH_USDC
```

## 🔍 Troubleshooting

### Common Issues

1. **Missing Market Pair**: Specify `--marketPair` parameter in your command
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
