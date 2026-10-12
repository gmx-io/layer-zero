import { EndpointId } from '@layerzerolabs/lz-definitions'

import { ExpansionNetworks } from './networks'

import type { Config, MarketPairConfig } from '../types'

/**
 * Standard token names
 */
export const GM_TOKEN_NAME = 'GMX Market'
export const GLV_TOKEN_NAME = 'GMX Liquidity Vault'

/**
 * Market pair configurations
 */
const WETH_USDC: MarketPairConfig = {
    GM: {
        tokenSymbol: 'GM: ETH/USD [WETH-USDC]',
        hubNetwork: {
            eid: EndpointId.ARBITRUM_V2_MAINNET,
            contractAddress: '0x70d95587d40a2caf56bd97485ab3eec10bee6336',
        },
        expansionNetworks: ExpansionNetworks.mainnet,
    },
    GLV: {
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
        tokenSymbol: 'GM: BTC/USD [WBTC-USDC]',
        hubNetwork: {
            eid: EndpointId.ARBITRUM_V2_MAINNET,
            contractAddress: '0x47c031236e19d024b42f8ae6780e44a573170703',
        },
        expansionNetworks: ExpansionNetworks.mainnet,
    },
    GLV: {
        tokenSymbol: 'GLV [WBTC-USDC]',
        hubNetwork: {
            eid: EndpointId.ARBITRUM_V2_MAINNET,
            contractAddress: '0xdF03EEd325b82bC1d4Db8b49c30ecc9E05104b96',
        },
        expansionNetworks: ExpansionNetworks.mainnet,
    },
}

const WETH_WETH: MarketPairConfig = {
    GM: {
        tokenSymbol: 'GM: ETH/USD [WETH-WETH]',
        hubNetwork: {
            eid: EndpointId.ARBITRUM_V2_MAINNET,
            contractAddress: '0x450bb6774Dd8a756274E0ab4107953259d2ac541',
        },
        expansionNetworks: ExpansionNetworks.mainnet,
    },
}

const BTC_BTC: MarketPairConfig = {
    GM: {
        tokenSymbol: 'GM: BTC/USD [BTC-BTC]',
        hubNetwork: {
            eid: EndpointId.ARBITRUM_V2_MAINNET,
            contractAddress: '0x7C11F78Ce78768518D743E81Fdfa2F860C6b9A77',
        },
        expansionNetworks: ExpansionNetworks.mainnet,
    },
}

const USDG_USDG: MarketPairConfig = {
    GLV: {
        tokenSymbol: 'GLV [USDG-USDG]',
        hubNetwork: {
            eid: EndpointId.ARBITRUM_V2_MAINNET,
            contractAddress: '0x4Cd5A94a30876320ac65F2e192493EE476f13866',
        },
        // Explicit list instead of ExpansionNetworks.mainnet: no Bera, plus Robinhood,
        // without pulling Robinhood into the existing market pairs' meshes
        expansionNetworks: [
            EndpointId.BASE_V2_MAINNET,
            EndpointId.BSC_V2_MAINNET,
            EndpointId.ETHEREUM_V2_MAINNET,
            EndpointId.ROBINHOOD_V2_MAINNET,
        ],
    },
}

const WETH_USDC_SG: MarketPairConfig = {
    GM: {
        tokenSymbol: 'GM WETH-USDC.SG',
        hubNetwork: {
            eid: EndpointId.ARBSEP_V2_TESTNET,
            contractAddress: '0xb6fC4C9eB02C35A134044526C62bb15014Ac0Bcc',
        },
        expansionNetworks: ExpansionNetworks.testnet,
    },
    GLV: {
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
    WETH_WETH,
    BTC_BTC,
    USDG_USDG,
    WETH_USDC_SG,
}
