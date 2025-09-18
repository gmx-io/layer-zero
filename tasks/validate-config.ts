import * as CliTable3 from 'cli-table3'
import { Contract } from 'ethers'
import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { TokenConfig, Tokens } from '../devtools'

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
    configName: string
    configSymbol: string
    onChainName: string
    onChainSymbol: string
    decimals: number
    nameMatch: boolean
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

            const [onChainName, onChainSymbol, decimals] = await Promise.all([
                contract.name(),
                contract.symbol(),
                contract.decimals(),
            ])

            return {
                marketPair,
                tokenType,
                network: networkName,
                contractAddress: tokenConfig.hubNetwork.contractAddress,
                configName: tokenConfig.tokenName,
                configSymbol: tokenConfig.tokenSymbol,
                onChainName,
                onChainSymbol,
                decimals,
                nameMatch: tokenConfig.tokenName === onChainName,
                symbolMatch: tokenConfig.tokenSymbol === onChainSymbol,
            }
        }
    }

    // Fallback: use current provider (assuming we're on the correct network)
    const contract = new Contract(tokenConfig.hubNetwork.contractAddress, ERC20_ABI, provider)

    const [onChainName, onChainSymbol, decimals] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
    ])

    return {
        marketPair,
        tokenType,
        network: networkName,
        contractAddress: tokenConfig.hubNetwork.contractAddress,
        configName: tokenConfig.tokenName,
        configSymbol: tokenConfig.tokenSymbol,
        onChainName,
        onChainSymbol,
        decimals,
        nameMatch: tokenConfig.tokenName === onChainName,
        symbolMatch: tokenConfig.tokenSymbol === onChainSymbol,
    }
}

function formatTable(results: ValidationResult[]): void {
    console.log('\n📊 Configuration Validation Results')

    const table = new CliTable3.default({
        head: [
            'Market Pair',
            'Contract Address',
            'On-Chain Name',
            'Name',
            'Config Symbol',
            'On-Chain Symbol',
            'Symbol',
            'Decimals',
        ],
        colWidths: [16, 44, 40, 7, 20, 20, 8, 10],
        wordWrap: true,
        wrapOnWordBoundary: false,
    })

    results.forEach((result) => {
        table.push([
            result.marketPair,
            result.contractAddress,
            result.onChainName,
            result.nameMatch ? '✅' : '❌',
            result.configSymbol,
            result.onChainSymbol,
            result.symbolMatch ? '✅' : '❌',
            result.decimals.toString(),
        ])
    })

    console.log(table.toString())

    // Summary
    const glvMismatches = results.filter((r) => !r.nameMatch || !r.symbolMatch)

    console.log('\n📋 Summary:')
    console.log(`   GLV tokens validated: ${results.length}`)
    console.log(`   GLV mismatches: ${glvMismatches.length}`)

    if (glvMismatches.length > 0) {
        console.log('\n⚠️  GLV Token Mismatches (these need attention):')
        glvMismatches.forEach((result) => {
            console.log(`   ${result.marketPair} GLV:`)
            if (!result.nameMatch) {
                console.log(`     Name: "${result.configName}" ≠ "${result.onChainName}"`)
            }
            if (!result.symbolMatch) {
                console.log(`     Symbol: "${result.configSymbol}" ≠ "${result.onChainSymbol}"`)
            }
        })
    } else {
        console.log('   ✅ All GLV tokens match their on-chain counterparts!')
    }
}

task('validate-config', 'Validates the devtools configuration against on-chain token data').setAction(
    async (taskArgs, hre: HardhatRuntimeEnvironment) => {
        console.log('Starting configuration validation...\n')

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
