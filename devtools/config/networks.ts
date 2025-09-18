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
 */
export const ExpansionNetworks = {
    testnet: [EndpointId.SEPOLIA_V2_TESTNET] as EndpointId[],
    mainnet: [
        EndpointId.BASE_V2_MAINNET,
        EndpointId.BERA_V2_MAINNET,
        EndpointId.BSC_V2_MAINNET,
        EndpointId.BOTANIX_V2_MAINNET,
        EndpointId.ETHEREUM_V2_MAINNET,
    ] as EndpointId[],
}
