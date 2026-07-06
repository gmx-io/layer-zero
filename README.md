# GMX Liquidity Vault (GLV) & GM Token Deployment

This project provides a comprehensive deployment and configuration system for GMX Liquidity Vault (GLV) and GM tokens across multiple blockchain networks using LayerZero's OmniChain technology.

## Table of Contents

- [Setup](#setup)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [LayerZero Wiring](#layerzero-wiring)
- [Removing a Network from the Mesh](#removing-a-network-from-the-mesh)
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

## Removing a Network from the Mesh

**Important**: `lz:sdk:wire` only reconciles pathways that are explicitly present in the config file it's given — it never scans on-chain state for pathways that used to exist and resets them. Removing a network from `ExpansionNetworks` would stop _future_ wire runs from touching it, but does **nothing on-chain** by itself, and permanently loses the historical record of what the mesh used to look like. Actually disconnecting a network requires generating transactions that explicitly unset its send/receive libraries and peer, which is what the tooling below does — and it's driven by config rather than deletion, so nothing needs to be removed from `ExpansionNetworks`/`hardhat.config.ts` at all.

### Marking a Network as Unwired

Add the network's eid to `UnwiredNetworks` in `devtools/config/networks.ts` (it stays listed in `ExpansionNetworks` — that array is kept as a permanent historical record of every network that's ever been part of the mesh):

```typescript
export const UnwiredNetworks = {
  testnet: [] as EndpointId[],
  mainnet: [EndpointId.BOTANIX_V2_MAINNET] as EndpointId[],
};
```

This one addition does two things simultaneously, and should be the very first step, before generating any payloads:

1. `generateWireConfig` (the normal `lz:sdk:wire` path) excludes any network listed here when building pathways — so a routine wire run for an unrelated market pair can't silently re-wire the network being removed while the staged teardown below is in progress, without deleting anything.
2. `generateUnwireConfig` (the `lz:sdk:unwire` path) _requires_ its target to be listed here — this is a guard rail against accidentally unwiring a network that's still supposed to be active.

**To reverse a removal at any point**: delete the eid from `UnwiredNetworks` and re-run the normal `lz:sdk:wire` flow — it resolves the correct current ULN302 and DVN addresses dynamically, so there's nothing else to restore. No other file needs to change, since nothing else was ever removed.

### Unwire Phases

Removal is done in three phases, run in this order, with a drain check in between:

1. **`send-block`**: points the send library at LayerZero's `BlockedMessageLib` (a library whose fallback always reverts) on both directions of every pathway between the target network and every other network in the mesh. Stops new messages from being created without affecting anything already in flight, since the receive path is left untouched.
2. **drain** (not a config phase — see [Checking for In-Flight Messages](#checking-for-in-flight-messages)): wait until there are no pending messages left on any pathway involving the target network.
3. **`receive-block`**: points the receive library at `BlockedMessageLib` on both directions. Safe to do only once the drain check confirms nothing is left in flight.
4. **`unpeer`**: calls `setPeer(eid, bytes32(0))` on both directions — the final, cleanest disconnection.

`receive-block` and `unpeer` can be combined into a single Safe batch once the drain check passes (see below) — there's no reason to make them separate multisig executions, since nothing in a healthy mesh depends on receive-blocking landing before unpeering.

### Unwire Command

```bash
npx hardhat lz:sdk:unwire \
  --target-network <NETWORK> \
  --phase <send-block|receive-block|unpeer> \
  [--market-pair <MARKET_PAIR>] \   # omit to process every market pair deployed to the target network
  [--token-type <GM|GLV>] \         # omit to process both
  [--signer <ADDRESS>] \
  [--generate-payloads] \
  [--dry-run] \
  [--assert] \
  [--ci]

# Examples
npx hardhat lz:sdk:unwire --target-network botanix-mainnet --phase send-block --dry-run
npx hardhat lz:sdk:unwire --target-network botanix-mainnet --phase send-block --generate-payloads --ci --signer 0x0000000000000000000000000000000000000001
```

### Converting Payloads to a Gnosis Safe Batch

`--generate-payloads` writes a raw dump of the transactions to `payloads/unwire-payloads-<phase>-<network>-<pair>-<type>-<timestamp>.json`, which isn't directly importable into Safe's UI. Convert one or more of these files into a Gnosis Safe Transaction Builder batch (one JSON file per native chain ID) with:

```bash
npx hardhat lz:sdk:payloads-to-safe \
  --input <GLOB_OR_COMMA_SEPARATED_LIST> \
  [--name <NAME>] \
  [--description <DESCRIPTION>] \
  [--output-dir payloads] \
  [--prefix safe-batch]   # output files are written as <prefix>-chain-<id>.json

# Example — combine every send-block payload for a network into per-chain Safe batches
npx hardhat lz:sdk:payloads-to-safe \
  --input "payloads/unwire-payloads-send-block-botanix-mainnet-*.json" \
  --name "Botanix removal - Stage 1: block send" \
  --prefix stage1-send-block

# Example — combine receive-block and unpeer into one atomic batch per chain
npx hardhat lz:sdk:payloads-to-safe \
  --input "payloads/unwire-payloads-receive-block-botanix-mainnet-*.json,payloads/unwire-payloads-unpeer-botanix-mainnet-*.json" \
  --name "Botanix removal - Stage 3+4: block receive + unpeer" \
  --prefix stage3-4-receive-unpeer
```

Give each stage a distinct `--prefix` (default `safe-batch`) — otherwise running the command again for a later stage overwrites the earlier stage's `<prefix>-chain-<id>.json` files, since both would write to the same filenames. Transactions with an identical target contract and calldata are also automatically deduplicated (with a warning), so an `--input` glob accidentally matching more than one stale run of the same market pair/phase can't result in a duplicated call in the batch. Even so, run `rm -rf payloads/` before generating a fresh set to keep the directory (and your glob matches) predictable.

### Checking for In-Flight Messages

Standalone, read-only script — no Hardhat context, RPC URL, or private key required, safe for anyone (including the team executing the Safe transactions) to run at any time:

```bash
pnpm ts-node scripts/check-inflight-messages.ts --target-network <NETWORK>
```

It checks every deployed OApp contract on the target network's full message history against [LayerZero's scan API](https://scan.layerzero-api.com) for any message that isn't yet in a terminal state (`DELIVERED`, `BLOCKED`, `APPLICATION_BURNED`, `APPLICATION_SKIPPED`), and prints a final `SAFE to proceed` / `NOT SAFE to proceed` / `INCONCLUSIVE` verdict. Only proceed to `receive-block` once it reports `SAFE`.

### Full Removal Runbook

```bash
# Step 0 — add the network's eid to UnwiredNetworks in devtools/config/networks.ts
# (see "Marking a Network as Unwired" above), immediately, before generating any payloads.

# Stage 1 — block send
npx hardhat lz:sdk:unwire --target-network botanix-mainnet --phase send-block --generate-payloads --ci --signer 0x0000000000000000000000000000000000000001
npx hardhat lz:sdk:payloads-to-safe --input "payloads/unwire-payloads-send-block-botanix-mainnet-*.json" --name "Botanix removal - Stage 1: block send" --prefix stage1-send-block
# -> hand payloads/stage1-send-block-chain-<id>.json to the team for Safe execution, one per chain

# GATE: wait until Stage 1 has executed on every chain.

# Stage 2 — drain check (repeat until it reports SAFE)
pnpm ts-node scripts/check-inflight-messages.ts --target-network botanix-mainnet

# Stage 3+4 — block receive + unpeer, combined into one Safe batch per chain
npx hardhat lz:sdk:unwire --target-network botanix-mainnet --phase receive-block --generate-payloads --ci --signer 0x0000000000000000000000000000000000000001
npx hardhat lz:sdk:unwire --target-network botanix-mainnet --phase unpeer --generate-payloads --ci --signer 0x0000000000000000000000000000000000000001
npx hardhat lz:sdk:payloads-to-safe \
  --input "payloads/unwire-payloads-receive-block-botanix-mainnet-*.json,payloads/unwire-payloads-unpeer-botanix-mainnet-*.json" \
  --name "Botanix removal - Stage 3+4: block receive + unpeer" \
  --prefix stage3-4-receive-unpeer

# No cleanup step needed — the network was never removed from ExpansionNetworks or
# hardhat.config.ts, so there's nothing left to undo once Stage 3+4 executes on-chain.
```

**To reverse or pause**: any stage is safe to leave in place indefinitely (nothing time-sensitive breaks by stopping after Stage 1, in particular). To fully restore a pathway, delete the network's eid from `UnwiredNetworks` and re-run the normal `lz:sdk:wire` flow — it resolves the correct current ULN302 and DVN addresses dynamically rather than relying on a hardcoded value that could go stale.

Every phase is idempotent in exactly the same way normal wiring is: `lz:sdk:unwire` runs through the identical on-chain diff engine as `lz:sdk:wire` (the same `configureSendLibraries`/`configureReceiveLibraries`/`configureOAppPeers` configurators), so re-running a phase that's already fully applied on-chain reports "no action necessary" and generates zero transactions, rather than re-proposing something already done. Use `--dry-run` (preview, no files written) or `--assert` (fails if any transaction is still required) to check a phase's status before generating payloads for it.

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

### Unwiring Tasks

See [Removing a Network from the Mesh](#removing-a-network-from-the-mesh) for the full staged process.

```bash
# Examples
npx hardhat lz:sdk:unwire --target-network botanix-mainnet --phase send-block --dry-run
npx hardhat lz:sdk:unwire --target-network botanix-mainnet --phase send-block --generate-payloads --ci
npx hardhat lz:sdk:payloads-to-safe --input "payloads/unwire-payloads-send-block-botanix-mainnet-*.json" --name "Stage 1: block send" --prefix stage1-send-block
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

```text
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
│   │   ├── wire-generator.ts    # Wire configuration generator (full mesh)
│   │   ├── unwire-generator.ts  # Unwire configuration generator (send-block/receive-block/unpeer)
│   │   ├── blocked-library.ts   # Resolves each chain's BlockedMessageLib address
│   │   ├── config.ts            # Wire-specific configs
│   │   └── index.ts
│   ├── payloads/                # Raw payload -> Gnosis Safe batch conversion
│   │   ├── to-safe-batch.ts
│   │   └── index.ts
│   ├── types.ts                 # TypeScript interfaces
│   └── index.ts                 # Main devtools export
├── deploy/                      # Hardhat deployment scripts
│   ├── GlvToken.ts              # GLV token deployment
│   └── MarketToken.ts           # GM token deployment
├── tasks/                       # Enhanced Hardhat tasks (lz:sdk:* commands)
│   ├── deploy-wrapper.ts        # Enhanced deploy command
│   ├── wire-wrapper.ts          # Enhanced wire command
│   ├── unwire-wrapper.ts        # Chain-removal wire command (send-block/receive-block/unpeer)
│   ├── payloads-to-safe-wrapper.ts  # Converts raw payloads into Gnosis Safe Transaction Builder JSON
│   ├── ownership-wrapper.ts     # Enhanced ownership transfer command
│   ├── validate-deployments.ts  # Deployment validation with quoteSend testing
│   ├── validate-config.ts       # Configuration validation
│   ├── display-deployments.ts   # Deployment display utilities
│   ├── vape-send-tokens.ts      # Token sending utilities
│   └── index.ts                 # Task exports
├── scripts/
│   ├── check-inflight-messages.ts  # Read-only scan-API check before unpeering a network
│   ├── standard-json-generator.ts
│   └── verify-contracts.ts
├── payloads/                    # Generated transaction payloads (created automatically)
│   ├── wire-payloads-*.json     # Raw multisig transaction payloads (wire/unwire)
│   ├── unwire-payloads-*.json
│   └── safe-batch-chain-*.json  # Gnosis Safe Transaction Builder batches, one per chain
├── deployments/                 # Hardhat deployment artifacts
│   ├── arbitrum-mainnet/        # Network-specific deployments
│   ├── base-mainnet/
│   └── ...                      # Other networks
├── layerzero.gm.mainnet.config.ts    # GM mainnet LayerZero configuration
├── layerzero.gm.testnet.config.ts    # GM testnet LayerZero configuration
├── layerzero.glv.mainnet.config.ts   # GLV mainnet LayerZero configuration
├── layerzero.glv.testnet.config.ts   # GLV testnet LayerZero configuration
├── layerzero.unwire.config.ts        # Chain-removal LayerZero configuration
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

1. Deploy with new market pair:

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

1. Update `hardhat.config.ts`:

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

### Remove Network

See [Removing a Network from the Mesh](#removing-a-network-from-the-mesh) for the full staged runbook — summarized:

```bash
# 1. Add the network's eid to UnwiredNetworks in devtools/config/networks.ts
#    (it stays in ExpansionNetworks and hardhat.config.ts — nothing is deleted)

# 2. Stage 1: block send, then hand the Safe batch to the team for execution
npx hardhat lz:sdk:unwire --target-network <NETWORK> --phase send-block --generate-payloads --ci
npx hardhat lz:sdk:payloads-to-safe --input "payloads/unwire-payloads-send-block-<NETWORK>-*.json" --name "Stage 1" --prefix stage1-send-block

# 3. Confirm nothing is left in flight (repeat until it reports SAFE)
pnpm ts-node scripts/check-inflight-messages.ts --target-network <NETWORK>

# 4. Stage 3+4: block receive + unpeer, combined into one Safe batch, then execute
npx hardhat lz:sdk:unwire --target-network <NETWORK> --phase receive-block --generate-payloads --ci
npx hardhat lz:sdk:unwire --target-network <NETWORK> --phase unpeer --generate-payloads --ci
npx hardhat lz:sdk:payloads-to-safe --input "payloads/unwire-payloads-receive-block-<NETWORK>-*.json,payloads/unwire-payloads-unpeer-<NETWORK>-*.json" --name "Stage 3+4" --prefix stage3-4-receive-unpeer

# No cleanup step — nothing was removed, so there's nothing to undo.
```

### Verify Contracts

Two methods to verify contracts are available.

#### Standard JSON Files

Manually verify contract in block explorers by generating standard JSON files (<https://docs.soliditylang.org/en/latest/using-the-compiler.html#compiler-api>).

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
7. **Unexpected transaction count in a Safe batch**: `lz:sdk:unwire --generate-payloads` writes a new timestamped file every run and never deletes old ones. If `lz:sdk:payloads-to-safe --input`'s glob matches more than one run of the same market pair/phase, duplicate transactions are automatically dropped (with a warning), but it's still worth running `rm -rf payloads/` before generating a fresh set so your glob only ever matches what you intend

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
