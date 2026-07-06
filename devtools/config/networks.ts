import { EndpointId } from '@layerzerolabs/lz-definitions'

/**
 * Block confirmations required for each network
 */
export const BlockConfirmations: Partial<Record<EndpointId, number>> = {
    // Mainnet networks
    [EndpointId.ARBITRUM_V2_MAINNET]: 20,
    [EndpointId.BASE_V2_MAINNET]: 10,
    [EndpointId.BERA_V2_MAINNET]: 20,
    [EndpointId.BOTANIX_V2_MAINNET]: 2,
    [EndpointId.BSC_V2_MAINNET]: 20,
    [EndpointId.ETHEREUM_V2_MAINNET]: 15,

    // Testnet networks
    [EndpointId.ARBSEP_V2_TESTNET]: 1,
    [EndpointId.SEPOLIA_V2_TESTNET]: 1,
}

/**
 * Ownership transfer addresses for each network
 */
export const OwnershipTransfer: Partial<Record<EndpointId, string>> = {
    // Mainnet networks
    [EndpointId.ARBITRUM_V2_MAINNET]: '0x8D1d2e24eC641eDC6a1ebe0F3aE7af0EBC573e0D',
    [EndpointId.BASE_V2_MAINNET]: '0x8D1d2e24eC641eDC6a1ebe0F3aE7af0EBC573e0D',
    [EndpointId.BERA_V2_MAINNET]: '0x8D1d2e24eC641eDC6a1ebe0F3aE7af0EBC573e0D',
    [EndpointId.BOTANIX_V2_MAINNET]: '0x656fa39BdB5984b477FA6aB443195D72D1Accc1c',
    [EndpointId.BSC_V2_MAINNET]: '0x8D1d2e24eC641eDC6a1ebe0F3aE7af0EBC573e0D',
    [EndpointId.ETHEREUM_V2_MAINNET]: '0x8D1d2e24eC641eDC6a1ebe0F3aE7af0EBC573e0D',

    // Testnet networks
    [EndpointId.ARBSEP_V2_TESTNET]: '0xCD9706B6B71fdC4351091B5b1D910cEe7Fde28D0',
    [EndpointId.SEPOLIA_V2_TESTNET]: '0xCD9706B6B71fdC4351091B5b1D910cEe7Fde28D0',
}

/**
 * Expansion network configurations
 *
 * This list is kept as the historical record of every network that has ever been part of the
 * mesh, including ones currently being (or already) decommissioned — see `UnwiredNetworks`
 * below. Do not remove a network from here to take it out of the mesh; add its eid to
 * `UnwiredNetworks` instead, which `generateWireConfig` excludes when building pathways. This
 * keeps re-wiring a decommissioned network later a one-line change (removing it from
 * `UnwiredNetworks`) rather than having to reconstruct what was deleted.
 */
export const ExpansionNetworks = {
    testnet: [EndpointId.SEPOLIA_V2_TESTNET] as EndpointId[],
    mainnet: [
        EndpointId.BASE_V2_MAINNET,
        EndpointId.BERA_V2_MAINNET,
        EndpointId.BSC_V2_MAINNET,
        EndpointId.BOTANIX_V2_MAINNET, // unwired
        EndpointId.ETHEREUM_V2_MAINNET,
    ] as EndpointId[],
}

/**
 * Networks that are in the process of being (or have been) removed from the mesh via
 * `lz:sdk:unwire` (see devtools/wire/unwire-generator.ts). Listed here, `generateWireConfig`
 * excludes them from the pathways it builds, so a routine `lz:sdk:wire` run for an unrelated
 * market pair can't silently re-wire a network mid-teardown — without needing to actually
 * remove it from `ExpansionNetworks`/`hardhat.config.ts`/etc. `lz:sdk:unwire` itself requires
 * its target to be listed here, so an active network can't be accidentally unwired.
 *
 * To reverse a removal, delete the eid from this list and re-run the normal `lz:sdk:wire`
 * flow — no other config changes are needed.
 */
export const UnwiredNetworks = {
    testnet: [] as EndpointId[],
    mainnet: [EndpointId.BOTANIX_V2_MAINNET] as EndpointId[],
}
