#!/usr/bin/env node

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

interface DeploymentInfo {
    address: string
    args: unknown[]
    contractName: string
    filePath: string
}

interface DeploymentFile {
    address: string
    args?: unknown[]
    storageLayout?: {
        storage?: Array<{
            contract?: string
        }>
    }
    metadata?:
        | string
        | {
              settings?: {
                  compilationTarget?: Record<string, string>
              }
          }
}

/**
 * Extracts contract path from deployment file content
 */
function extractContractPath(deployment: DeploymentFile, filename: string): string {
    // Try to find contract path in storage layout or metadata
    if (deployment.storageLayout && deployment.storageLayout.storage) {
        const firstStorage = deployment.storageLayout.storage[0]
        if (firstStorage && firstStorage.contract) {
            return firstStorage.contract
        }
    }

    // Fallback: try to extract from metadata if it contains contract information
    if (deployment.metadata) {
        try {
            const metadata =
                typeof deployment.metadata === 'string' ? JSON.parse(deployment.metadata) : deployment.metadata

            // Some deployment formats store contract path in settings
            if (metadata.settings && metadata.settings.compilationTarget) {
                const compilationTarget = metadata.settings.compilationTarget
                const contractFile = Object.keys(compilationTarget)[0]
                const contractName = compilationTarget[contractFile]
                return `${contractFile}:${contractName}`
            }
        } catch (e) {
            // Ignore JSON parsing errors, continue with fallback
        }
    }

    throw new Error(`Could not determine contract path for file: ${filename}`)
}

/**
 * Reads a deployment JSON file and extracts verification info
 */
function readDeploymentFile(filePath: string): DeploymentInfo {
    const content = fs.readFileSync(filePath, 'utf8')
    const deployment = JSON.parse(content) as DeploymentFile

    const filename = path.basename(filePath, '.json')
    const contractPath = extractContractPath(deployment, filename)

    return {
        address: deployment.address,
        args: deployment.args || [],
        contractName: contractPath,
        filePath: filePath,
    }
}

/**
 * Executes hardhat verify command for a contract
 */
function verifyContract(chainSlug: string, deployment: DeploymentInfo, force = false): void {
    console.log(`\n🔍 Verifying ${deployment.contractName} at ${deployment.address}...`)

    // Format constructor arguments by properly quoting strings and joining with spaces
    const formattedArgs = deployment.args
        .map((arg) => {
            if (typeof arg === 'string') {
                return `"${arg}"`
            }
            return String(arg)
        })
        .join(' ')

    const forceFlag = force ? '--force ' : ''
    const command =
        deployment.args.length > 0
            ? `pnpm hardhat verify ${forceFlag}--network ${chainSlug} --contract ${deployment.contractName} ${deployment.address} ${formattedArgs}`
            : `pnpm hardhat verify ${forceFlag}--network ${chainSlug} --contract ${deployment.contractName} ${deployment.address}`

    console.log(`📝 Command: ${command}`)

    try {
        execSync(command, {
            encoding: 'utf8',
            cwd: process.cwd(),
            stdio: 'inherit',
        })
        console.log(`✅ Successfully verified ${deployment.contractName}`)
    } catch (error) {
        console.error(`❌ Failed to verify ${deployment.contractName}:`, (error as Error).message)
        // Continue with other contracts even if one fails
    }
}

/**
 * Main function to verify all contracts for a given chain
 */
function main() {
    // Parse command line arguments
    const args = process.argv.slice(2)
    const forceIndex = args.indexOf('--force')
    const force = forceIndex !== -1

    // Remove --force from args to get the chain slug
    const filteredArgs = args.filter((arg) => arg !== '--force')
    const chainSlug = filteredArgs[0]

    if (!chainSlug) {
        console.error('❌ Please provide a chain slug as an argument')
        console.log('Usage: pnpm tsx scripts/verify-contracts.ts <chain-slug> [--force]')
        console.log('Example: pnpm tsx scripts/verify-contracts.ts botanix-mainnet')
        console.log('Example with force: pnpm tsx scripts/verify-contracts.ts botanix-mainnet --force')
        process.exit(1)
    }

    const deploymentsDir = path.join(process.cwd(), 'deployments', chainSlug)

    if (!fs.existsSync(deploymentsDir)) {
        console.error(`❌ Deployments directory not found: ${deploymentsDir}`)
        process.exit(1)
    }

    console.log(`🚀 Starting verification for chain: ${chainSlug}`)
    console.log(`📁 Reading deployments from: ${deploymentsDir}`)
    if (force) {
        console.log(`🔨 Force flag enabled - will re-verify already verified contracts`)
    }

    // Read all JSON files from the deployments directory
    const files = fs
        .readdirSync(deploymentsDir)
        .filter((file) => file.endsWith('.json') && !file.includes('solcInputs'))
        .map((file) => path.join(deploymentsDir, file))

    if (files.length === 0) {
        console.log('⚠️  No deployment files found')
        process.exit(0)
    }

    console.log(`📋 Found ${files.length} deployment files:`)
    files.forEach((file) => console.log(`   - ${path.basename(file)}`))

    // Process each deployment file
    const deployments: DeploymentInfo[] = []

    for (const filePath of files) {
        try {
            const deployment = readDeploymentFile(filePath)
            deployments.push(deployment)
            console.log(`✓ Loaded ${path.basename(filePath)}: ${deployment.address}`)
        } catch (error) {
            console.error(`❌ Failed to read ${path.basename(filePath)}:`, (error as Error).message)
        }
    }

    if (deployments.length === 0) {
        console.log('⚠️  No valid deployments found')
        process.exit(0)
    }

    console.log(`\n🔧 Starting verification process for ${deployments.length} contracts...\n`)

    // Verify each contract
    for (const deployment of deployments) {
        try {
            verifyContract(chainSlug, deployment, force)
        } catch (error) {
            console.error(`❌ Verification failed for ${deployment.contractName}:`, (error as Error).message)
        }
    }

    console.log('\n🎉 Verification process completed!')
}

// Run the script
if (require.main === module) {
    main()
}
