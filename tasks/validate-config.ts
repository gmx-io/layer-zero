import * as CliTable3 from 'cli-table3'
import { Contract } from 'ethers'
import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { GLV_TOKEN_NAME, GM_TOKEN_NAME, TokenConfig, Tokens, validateHubNetworksNotInExpansion } from '../devtools'

// ERC20 ABI for getting token info
const ERC20_ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
]

interface ValidationResult {
    marketPair: string
    tokenType: 'GM' | 'GLV'
    network: string
    contractAddress: string
    configSymbol: string
    onChainSymbol: string
    decimals: number
    symbolMatch: boolean
}

async function validateTokenConfig(
    hre: HardhatRuntimeEnvironment,
    marketPair: string,
    tokenType: 'GM' | 'GLV',
    tokenConfig: TokenConfig
): Promise<ValidationResult> {
    // Get network name from endpoint ID
    const networkName =
        Object.entries(hre.config.networks).find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ([_, networkConfig]) => (networkConfig as any).eid === tokenConfig.hubNetwork.eid
        )?.[0] || 'unknown'

    // Connect to the appropriate network
    const provider = hre.ethers.provider
    if (networkName !== 'unknown' && networkName !== hre.network.name) {
        // Switch to the hub network if not already connected
        const hubNetwork = hre.config.networks[networkName]
        if (hubNetwork && 'url' in hubNetwork) {
            const newProvider = new hre.ethers.providers.JsonRpcProvider(hubNetwork.url)
            const contract = new Contract(tokenConfig.hubNetwork.contractAddress, ERC20_ABI, newProvider)

            const [onChainSymbol, decimals] = await Promise.all([contract.symbol(), contract.decimals()])

            return {
                marketPair,
                tokenType,
                network: networkName,
                contractAddress: tokenConfig.hubNetwork.contractAddress,
                configSymbol: tokenConfig.tokenSymbol,
                onChainSymbol,
                decimals,
                symbolMatch: tokenConfig.tokenSymbol === onChainSymbol,
            }
        }
    }

    // Fallback: use current provider (assuming we're on the correct network)
    const contract = new Contract(tokenConfig.hubNetwork.contractAddress, ERC20_ABI, provider)

    const [onChainSymbol, decimals] = await Promise.all([contract.symbol(), contract.decimals()])

    return {
        marketPair,
        tokenType,
        network: networkName,
        contractAddress: tokenConfig.hubNetwork.contractAddress,
        configSymbol: tokenConfig.tokenSymbol,
        onChainSymbol,
        decimals,
        symbolMatch: tokenConfig.tokenSymbol === onChainSymbol,
    }
}

function formatTable(results: ValidationResult[]): void {
    console.log('\n📊 Configuration Validation Results')

    const table = new CliTable3.default({
        head: ['Market Pair', 'Contract Address', 'Config Symbol', 'On-Chain Symbol', 'Symbol', 'Decimals'],
        colWidths: [16, 44, 25, 25, 8, 10],
        wordWrap: true,
        wrapOnWordBoundary: false,
    })

    results.forEach((result) => {
        table.push([
            result.marketPair,
            result.contractAddress,
            result.configSymbol,
            result.onChainSymbol,
            result.symbolMatch ? '✅' : '❌',
            result.decimals.toString(),
        ])
    })

    console.log(table.toString())

    // Summary
    const glvMismatches = results.filter((r) => !r.symbolMatch)

    console.log('\n📋 Summary:')
    console.log(`   GLV tokens validated: ${results.length}`)
    console.log(`   GLV mismatches: ${glvMismatches.length}`)

    if (glvMismatches.length > 0) {
        console.log('\n⚠️  GLV Token Mismatches (these need attention):')
        glvMismatches.forEach((result) => {
            console.log(`   ${result.marketPair} GLV:`)
            console.log(`     Symbol: "${result.configSymbol}" ≠ "${result.onChainSymbol}"`)
        })
    } else {
        console.log('   ✅ All GLV tokens match their on-chain counterparts!')
    }
}

task('validate-config', 'Validates the devtools configuration against on-chain token data').setAction(
    async (taskArgs, hre: HardhatRuntimeEnvironment) => {
        console.log('Starting configuration validation...\n')

        // First, validate that hub networks are not in expansion networks
        console.log('🔍 Validating configuration structure...')
        for (const [marketPairKey, marketPairConfig] of Object.entries(Tokens)) {
            try {
                validateHubNetworksNotInExpansion(marketPairConfig)
                console.log(`✅ ${marketPairKey}: Configuration structure valid`)
            } catch (error) {
                console.error(`❌ ${marketPairKey}: ${error instanceof Error ? error.message : String(error)}`)
                return
            }
        }

        console.log('\n🔍 Validating on-chain token data...')
        const results: ValidationResult[] = []

        // Process each market pair in the config
        for (const [marketPairKey, marketPairConfig] of Object.entries(Tokens)) {
            console.log(`📈 Processing ${marketPairKey} GLV...`)

            try {
                // Validate GLV token only
                const glvResult = await validateTokenConfig(
                    hre,
                    marketPairKey,
                    'GLV',
                    marketPairConfig.GLV as TokenConfig
                )
                results.push(glvResult)
            } catch (error) {
                console.error(`   ❌ Error validating ${marketPairKey} GLV:`, error)
            }
        }

        // Display results in a formatted table
        formatTable(results)
    }
)
