import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { Tokens } from '../config'
import { DeployConfig, MarketPairConfig } from '../types'

/**
 * Gets the market pair configuration for deployment
 * Requires MARKET_PAIR environment variable to be set
 */
export async function getDeployConfig(): Promise<DeployConfig> {
    const marketPairKey = process.env.MARKET_PAIR

    if (marketPairKey) {
        const marketPairConfig = Tokens[marketPairKey]
        if (marketPairConfig) {
            return { marketPairKey, marketPairConfig }
        } else {
            console.error(`❌ Market pair '${marketPairKey}' not found in config`)
            console.log(`Available market pairs: ${Object.keys(Tokens).join(', ')}`)
            process.exit(1)
        }
    }

    // If no env var, show available options and exit
    const availableKeys = Object.keys(Tokens)
    console.log('\n❌ No MARKET_PAIR environment variable set.')
    console.log('\n📋 Available market pairs:')

    // Find the longest key for alignment
    const maxKeyLength = Math.max(...availableKeys.map((key) => key.length))

    availableKeys.forEach((key) => {
        console.log(`   MARKET_PAIR=${key.padEnd(maxKeyLength)}  # ${Tokens[key].GLV.tokenName}`)
    })

    console.log('\n💡 Usage examples:')
    console.log(`   MARKET_PAIR=${'WETH_USDC'.padEnd(maxKeyLength)} npx hardhat lz:deploy`)
    console.log(`   MARKET_PAIR=${'WBTC_USDC'.padEnd(maxKeyLength)} npx hardhat deploy --network arbitrum-mainnet`)
    console.log('')

    process.exit(1)
}

// Track which networks we've already logged info for
const loggedNetworks = new Set<string>()

/**
 * Logs network deployment info (cached per network)
 */
export async function logNetworkInfo(
    hre: HardhatRuntimeEnvironment,
    networkName: string,
    deployer: string,
    eid: number
): Promise<void> {
    if (!loggedNetworks.has(networkName)) {
        console.log(`\nNetwork: ${networkName}`)
        console.log(`EID: ${eid}`)

        // Get all named accounts
        const namedAccounts = await hre.getNamedAccounts()
        console.log(`Named Accounts:`)

        // Find the longest name for padding
        const maxNameLength = Math.max(...Object.keys(namedAccounts).map((name) => name.length))

        for (const [name, address] of Object.entries(namedAccounts)) {
            console.log(`  ${name.padEnd(maxNameLength)}: ${address}`)
        }

        console.log()
        loggedNetworks.add(networkName)
    }
}

/**
 * Checks if a hub network EID exists in a list of network EIDs
 */
export function isHubInNetworks(
    marketPairConfig: MarketPairConfig,
    tokenType: 'GM' | 'GLV',
    networkEids: number[]
): boolean {
    const hubEid = marketPairConfig[tokenType].hubNetwork.eid
    return networkEids.includes(hubEid)
}

/**
 * Validates that hub networks are not in the expansion networks list
 * Throws an error if validation fails
 */
export function validateHubNetworksNotInExpansion(marketPairConfig: MarketPairConfig): void {
    const glvHubEid = marketPairConfig.GLV.hubNetwork.eid
    const gmHubEid = marketPairConfig.GM.hubNetwork.eid
    const glvExpansionNetworks = marketPairConfig.GLV.expansionNetworks || []
    const gmExpansionNetworks = marketPairConfig.GM.expansionNetworks || []

    const errors: string[] = []

    if (glvExpansionNetworks.includes(glvHubEid)) {
        errors.push(`GLV hub network (EID: ${glvHubEid}) should not be in GLV expansion networks`)
    }

    if (glvExpansionNetworks.includes(gmHubEid)) {
        errors.push(`GM hub network (EID: ${gmHubEid}) should not be in GLV expansion networks`)
    }

    if (gmExpansionNetworks.includes(glvHubEid)) {
        errors.push(`GLV hub network (EID: ${glvHubEid}) should not be in GM expansion networks`)
    }

    if (gmExpansionNetworks.includes(gmHubEid)) {
        errors.push(`GM hub network (EID: ${gmHubEid}) should not be in GM expansion networks`)
    }

    if (errors.length > 0) {
        console.error('❌ Configuration validation failed:')
        errors.forEach((error) => console.error(`   ${error}`))
        throw new Error('Hub networks found in expansion networks. This is not allowed.')
    }
}

/**
 * Checks if the current network should be deployed to (either hub or expansion network)
 */
export function shouldDeployToNetwork(marketPairConfig: MarketPairConfig, currentEid: number): boolean {
    const glvConfig = marketPairConfig.GLV
    const gmConfig = marketPairConfig.GM

    // Check if current EID is a hub network
    const isGlvHub = glvConfig.hubNetwork.eid === currentEid
    const isGmHub = gmConfig.hubNetwork.eid === currentEid

    // Check if current EID is in expansion networks
    const isGlvExpansion = glvConfig.expansionNetworks?.includes(currentEid) || false
    const isGmExpansion = gmConfig.expansionNetworks?.includes(currentEid) || false

    return isGlvHub || isGmHub || isGlvExpansion || isGmExpansion
}

/**
 * Checks if the current network is the hub network for the given token type
 */
export function isHubNetwork(marketPairConfig: MarketPairConfig, tokenType: 'GM' | 'GLV', currentEid: number): boolean {
    const tokenConfig = marketPairConfig[tokenType]
    return tokenConfig.hubNetwork.eid === currentEid
}

/**
 * Gets the appropriate contract address based on network and token type
 */
export function getContractAddress(
    marketPairConfig: MarketPairConfig,
    tokenType: 'GM' | 'GLV',
    currentEid: number
): string {
    const tokenConfig = marketPairConfig[tokenType]

    // Check if we're on the hub network
    if (tokenConfig.hubNetwork.eid === currentEid) {
        return tokenConfig.hubNetwork.contractAddress
    }

    throw new Error(
        `No contract address configured for ${tokenType} token on network EID ${currentEid}. ` +
            `Hub network is EID ${tokenConfig.hubNetwork.eid}`
    )
}
