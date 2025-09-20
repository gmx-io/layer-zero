import fs from 'fs'
import path from 'path'

import CliTable from 'cli-table3'
import { constants } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'
import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { createGetHreByEid } from '@layerzerolabs/devtools-evm-hardhat'
import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'

interface DeploymentInfo {
    network: string
    address: string
    contractType: 'Adapter' | 'OFT'
    eid: number
}

interface GroupedDeployments {
    [marketPair: string]: {
        GM: DeploymentInfo[]
        GLV: DeploymentInfo[]
    }
}

interface ValidationResult {
    from: string
    to: string
    success: boolean
    error?: string
}

const validateDeployments = task('lz:sdk:validate-deployments', 'Validate OFT deployments by testing quoteSend() calls')
    .addOptionalParam(
        'filterNetworks',
        'Filter by specific networks (e.g., arbitrum-mainnet or arbitrum-mainnet,base-mainnet)'
    )
    .addFlag('mainnet', 'Show only mainnet deployments')
    .addFlag('testnet', 'Show only testnet deployments')
    .addOptionalParam('marketPair', 'Filter by specific market pair (e.g., WETH_USDC)')
    .addOptionalParam('tokenType', 'Filter by token type (GM or GLV)')
    .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
        const deploymentsDir = path.join(process.cwd(), 'deployments')

        if (!fs.existsSync(deploymentsDir)) {
            console.log('❌ No deployments directory found')
            return
        }

        // Get network configurations from hardhat config
        const networkEids: Record<string, number> = {}
        for (const [networkName, config] of Object.entries(hre.config.networks)) {
            if (config && typeof config === 'object' && 'eid' in config) {
                networkEids[networkName] = config.eid as number
            }
        }

        const allNetworks = fs
            .readdirSync(deploymentsDir, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name)

        const sourceNetworks = taskArgs.filterNetworks
            ? taskArgs.filterNetworks
                  .split(',')
                  .map((n: string) => n.trim())
                  .filter((network: string) => allNetworks.includes(network))
            : allNetworks.filter((network) => {
                  if (taskArgs.mainnet) return network.includes('mainnet') && !network.includes('testnet')
                  if (taskArgs.testnet) return network.includes('testnet')
                  return true
              })

        // Validate that all requested networks exist
        if (taskArgs.filterNetworks) {
            const requestedNetworks = taskArgs.filterNetworks.split(',').map((n: string) => n.trim())
            const missingNetworks = requestedNetworks.filter((network: string) => !allNetworks.includes(network))
            if (missingNetworks.length > 0) {
                console.log(`❌ Networks not found in deployments: ${missingNetworks.join(', ')}`)
                console.log(`Available networks: ${allNetworks.join(', ')}`)
                return
            }
        }

        const targetNetworks = allNetworks.filter((network) => {
            if (taskArgs.mainnet) return network.includes('mainnet') && !network.includes('testnet')
            if (taskArgs.testnet) return network.includes('testnet')
            return true
        })

        const grouped: GroupedDeployments = {}

        // Collect all deployments (source + target networks)
        const networksToScan = [...new Set([...sourceNetworks, ...targetNetworks])]
        for (const network of networksToScan) {
            const networkDir = path.join(deploymentsDir, network)
            const files = fs
                .readdirSync(networkDir)
                .filter((file) => file.endsWith('.json') && !file.includes('solcInputs'))

            for (const file of files) {
                const filePath = path.join(networkDir, file)

                try {
                    const deployment = JSON.parse(fs.readFileSync(filePath, 'utf8'))

                    // Parse filename: {TokenType}_{ContractType}_{MarketPair}.json
                    const match = file.match(/^(GlvToken|MarketToken)_(Adapter|OFT)_(.+)\.json$/)
                    if (!match) {
                        console.log(`⚠️  Skipping file: ${file} (doesn't match pattern)`)
                        continue
                    }

                    const [, tokenType, contractType, marketPair] = match
                    const tokenCategory = tokenType === 'GlvToken' ? 'GLV' : 'GM'

                    // Apply filters
                    if (taskArgs.marketPair && marketPair !== taskArgs.marketPair) continue
                    if (taskArgs.tokenType && tokenCategory !== taskArgs.tokenType) continue

                    if (!grouped[marketPair]) {
                        grouped[marketPair] = { GM: [], GLV: [] }
                    }

                    const eid = networkEids[network]
                    if (!eid) {
                        console.warn(`⚠️  No EID found for network ${network}`)
                        continue
                    }

                    grouped[marketPair][tokenCategory].push({
                        network,
                        address: deployment.address,
                        contractType: contractType as 'Adapter' | 'OFT',
                        eid,
                    })
                } catch (error) {
                    console.warn(`⚠️  Failed to parse ${file}: ${error}`)
                }
            }
        }

        if (Object.keys(grouped).length === 0) {
            console.log('❌ No deployments found to validate')
            return
        }

        const getHreByEid = createGetHreByEid(hre)

        // Track what we're processing for summary
        const processedSummary: string[] = []

        // Validate each market pair and token type
        for (const [marketPair, deployments] of Object.entries(grouped)) {
            const tokenTypes = ['GM', 'GLV'] as const

            for (const tokenType of tokenTypes) {
                const contracts = deployments[tokenType]
                if (contracts.length === 0) continue
                if (contracts.length < 2) {
                    console.log(
                        `⚠️  Skipping ${marketPair} ${tokenType} - need at least 2 contracts for cross-network validation (found ${contracts.length})`
                    )
                    continue
                }

                processedSummary.push(`${marketPair.replace(/_/g, '-')} ${tokenType}`)
                console.log(`\n📋 ${marketPair.replace(/_/g, '-')} - ${tokenType} Tokens`)
                console.log('='.repeat(60))

                // Create validation matrix
                const results: ValidationResult[] = []

                // Filter contracts by source/target networks
                const sourceContracts = contracts.filter((c) => sourceNetworks.includes(c.network))
                const targetContracts = contracts.filter((c) => targetNetworks.includes(c.network))

                for (const srcContract of sourceContracts) {
                    for (const dstContract of targetContracts) {
                        // Skip same network
                        if (srcContract.network === dstContract.network) continue

                        try {
                            const srcHre = await getHreByEid(srcContract.eid)
                            const signer = (await srcHre.ethers.getSigners())[0]

                            // Read deployment file to get ABI
                            const deploymentPath = path.join(
                                deploymentsDir,
                                srcContract.network,
                                `${tokenType === 'GM' ? 'MarketToken' : 'GlvToken'}_${srcContract.contractType}_${marketPair}.json`
                            )
                            const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))

                            // Get contract using deployment ABI
                            const oft = await srcHre.ethers.getContractAt(
                                deploymentData.abi,
                                srcContract.address,
                                signer
                            )

                            // Prepare sendParam with 1 token (18 decimals assumed)
                            const sendParam = {
                                dstEid: dstContract.eid,
                                to: addressToBytes32(constants.AddressZero), // Zero address
                                amountLD: parseUnits('1', 18).toString(), // 1 token
                                minAmountLD: parseUnits('1', 18).toString(), // 1 token minimum
                                extraOptions: '0x',
                                composeMsg: '0x',
                                oftCmd: '0x',
                            }

                            // Test quoteSend
                            await oft.quoteSend(sendParam, false)

                            results.push({
                                from: srcContract.network,
                                to: dstContract.network,
                                success: true,
                            })
                        } catch (error) {
                            results.push({
                                from: srcContract.network,
                                to: dstContract.network,
                                success: false,
                                error: error instanceof Error ? error.message : String(error),
                            })
                        }
                    }
                }

                // Display results in table format
                const displaySourceNetworks = taskArgs.filterNetworks
                    ? sourceNetworks
                    : [...new Set(results.map((r) => r.from))].sort()
                const displayTargetNetworks = taskArgs.filterNetworks
                    ? targetNetworks
                    : [...new Set(results.map((r) => r.to))].sort()
                const allDisplayNetworks = [...new Set([...displaySourceNetworks, ...displayTargetNetworks])].sort()

                if (allDisplayNetworks.length === 0) {
                    console.log('No cross-network paths to validate\n')
                    continue
                }

                // Helper function to clean network names
                const cleanNetworkName = (name: string) => name.replace('-mainnet', '').replace('-testnet', '')

                // Create table with cli-table3
                const table = new CliTable({
                    head: ['FROM \\ TO', ...displayTargetNetworks.map((n) => cleanNetworkName(n).substring(0, 8))],
                    style: {
                        head: ['cyan'],
                        border: ['grey'],
                    },
                })

                // Add table rows - only show source networks that we're testing from
                for (const fromNetwork of displaySourceNetworks) {
                    const row: string[] = [cleanNetworkName(fromNetwork)]
                    for (const toNetwork of displayTargetNetworks) {
                        if (fromNetwork === toNetwork) {
                            row.push('▬') // Same network indicator
                        } else {
                            const result = results.find((r) => r.from === fromNetwork && r.to === toNetwork)
                            row.push(result?.success ? '✅' : result ? '❌' : '—')
                        }
                    }
                    table.push(row)
                }

                console.log(table.toString())

                // Summary
                const successful = results.filter((r) => r.success).length
                const total = results.length
                const percentage = total > 0 ? ((successful / total) * 100).toFixed(1) : '0'

                console.log(`\n📊 Summary: ${successful}/${total} paths successful (${percentage}%)`)

                // Show failed connections details
                const failed = results.filter((r) => !r.success)
                if (failed.length > 0) {
                    console.log('\n❌ Failed Connections:')
                    failed.forEach((f) => {
                        const shortError = f.error
                            ? f.error.substring(0, 80) + (f.error.length > 80 ? '...' : '')
                            : 'Unknown error'
                        console.log(`   ${f.from} → ${f.to}: ${shortError}`)
                    })
                }
            }
        }

        console.log(`\n✅ Validation complete`)
        if (processedSummary.length > 0) {
            console.log(`📊 Validated: ${processedSummary.join(', ')}`)
        }
    })

export { validateDeployments }
