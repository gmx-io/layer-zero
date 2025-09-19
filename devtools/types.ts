import { EndpointId } from '@layerzerolabs/lz-definitions'
import { OAppEnforcedOption } from '@layerzerolabs/toolbox-hardhat'

/**
 * Hub network configuration
 */
export interface HubNetwork {
    eid: EndpointId
    contractAddress: string
}

/**
 * Token configuration for a single token (GM or GLV)
 */
export interface TokenConfig {
    tokenSymbol: string
    hubNetwork: HubNetwork
    expansionNetworks: EndpointId[]
}

/**
 * Market pair configuration containing both GM and GLV tokens
 */
export interface MarketPairConfig {
    GM: TokenConfig
    GLV: TokenConfig
}

/**
 * Complete configuration object
 */
export interface Config {
    [key: string]: MarketPairConfig
}

/**
 * Deploy configuration result
 */
export interface DeployConfig {
    marketPairKey: string
    marketPairConfig: MarketPairConfig
}

/**
 * Type aliases for convenience
 */
export type MarketPairKey = keyof Config
export type TokenType = keyof MarketPairConfig
export type EnforcedOptionsConfig = [OAppEnforcedOption[], OAppEnforcedOption[]]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DVNConfig = [string[], any[]]
