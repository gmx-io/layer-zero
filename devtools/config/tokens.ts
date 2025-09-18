import { EndpointId } from '@layerzerolabs/lz-definitions'

import { ExpansionNetworks } from './networks'

import type { Config, MarketPairConfig } from '../types'

/**
 * Market pair configurations
 */
const WETH_USDC: MarketPairConfig = {
    GM: {
        tokenName: 'GM WETH-USDC',
        tokenSymbol: 'GM WETH-USDC',
        hubNetwork: {
            eid: EndpointId.ARBITRUM_V2_MAINNET,
            contractAddress: '0x70d95587d40a2caf56bd97485ab3eec10bee6336',
        },
        expansionNetworks: ExpansionNetworks.mainnet,
    },
    GLV: {
        tokenName: 'GMX Liquidity Vault [WETH-USDC]',
        tokenSymbol: 'GLV [WETH-USDC]',
        hubNetwork: {
            eid: EndpointId.ARBITRUM_V2_MAINNET,
            contractAddress: '0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9',
        },
        expansionNetworks: ExpansionNetworks.mainnet,
    },
}

const WBTC_USDC: MarketPairConfig = {
    GM: {
        tokenName: 'GM WBTC-USDC',
        tokenSymbol: 'GM WBTC-USDC',
        hubNetwork: {
            eid: EndpointId.ARBITRUM_V2_MAINNET,
            contractAddress: '0x47c031236e19d024b42f8ae6780e44a573170703',
        },
        expansionNetworks: ExpansionNetworks.mainnet,
    },
    GLV: {
        tokenName: 'GMX Liquidity Vault [WBTC-USDC]',
        tokenSymbol: 'GLV [WBTC-USDC]',
        hubNetwork: {
            eid: EndpointId.ARBITRUM_V2_MAINNET,
            contractAddress: '0xdF03EEd325b82bC1d4Db8b49c30ecc9E05104b96',
        },
        expansionNetworks: ExpansionNetworks.mainnet,
    },
}

const WETH_USDC_SG: MarketPairConfig = {
    GM: {
        tokenName: 'GM WETH-USDC.SG',
        tokenSymbol: 'GM WETH-USDC.SG',
        hubNetwork: {
            eid: EndpointId.ARBSEP_V2_TESTNET,
            contractAddress: '0xb6fC4C9eB02C35A134044526C62bb15014Ac0Bcc',
        },
        expansionNetworks: ExpansionNetworks.testnet,
    },
    GLV: {
        tokenName: 'GMX Liquidity Vault [WETH-USDC.SG]',
        tokenSymbol: 'GLV [WETH-USDC.SG]',
        hubNetwork: {
            eid: EndpointId.ARBSEP_V2_TESTNET,
            contractAddress: '0xAb3567e55c205c62B141967145F37b7695a9F854',
        },
        expansionNetworks: ExpansionNetworks.testnet,
    },
}

/**
 * Complete token configuration
 */
export const Tokens: Config = {
    WETH_USDC,
    WBTC_USDC,
    WETH_USDC_SG,
}
