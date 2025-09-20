import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'

interface DeployArgs {
    marketPair: string
    networks?: string | string[]
    reset?: boolean
    stage?: string
    tags?: string | string[]
    ci?: boolean
    logLevel?: string
}

const deployWrapper = task('lz:sdk:deploy', 'Wrapper for LayerZero deploy command with market pair support')
    .addParam('marketPair', 'Market pair to deploy (e.g., WETH_USDC)')
    .addOptionalParam('networks', 'List of comma-separated networks to deploy to')
    .addOptionalParam('stage', 'Chain stage (mainnet, testnet, sandbox)')
    .addOptionalParam('tags', 'List of comma-separated deploy script tags')
    .addOptionalParam('logLevel', 'Logging level (error, warn, info, verbose, debug, silly)')
    .addFlag('reset', 'Delete existing deployments before deploying')
    .addFlag('ci', 'Continuous integration mode (non-interactive)')
    .setAction(async (taskArgs: DeployArgs, hre: HardhatRuntimeEnvironment) => {
        const { marketPair, networks, reset, stage, tags, ci, logLevel } = taskArgs

        setDefaultLogLevel(logLevel || 'info')
        const logger = createModuleLogger('deploy-wrapper', logLevel || 'info')

        logger.info(`Deploying contracts for market pair: ${marketPair}`)
        if (networks) logger.info(`Networks: ${networks}`)
        if (stage) logger.info(`Stage: ${stage}`)
        if (tags) logger.info(`Tags: ${tags}`)

        // Set environment variable for the deployment process
        const oldMarketPair = process.env.MARKET_PAIR

        try {
            // Set MARKET_PAIR environment variable
            process.env.MARKET_PAIR = marketPair

            // Prepare arguments for the LayerZero deploy command
            const deployArgs: Record<string, string | string[] | boolean> = {}

            // Add optional parameters
            if (networks) {
                // Handle networks - convert to array format for LayerZero
                if (typeof networks === 'string') {
                    deployArgs.networks = networks.split(',').map((network) => network.trim())
                } else if (Array.isArray(networks)) {
                    // If it's already an array, check if any elements need splitting
                    deployArgs.networks = networks.flatMap((network: string) =>
                        typeof network === 'string' && network.includes(',')
                            ? network.split(',').map((n: string) => n.trim())
                            : network
                    )
                } else {
                    deployArgs.networks = networks
                }
            }
            if (stage) deployArgs.stage = stage
            if (tags) {
                // Convert tags to array format (LayerZero expects array)
                deployArgs.tags = typeof tags === 'string' ? tags.split(',').map((tag) => tag.trim()) : tags
            }
            if (logLevel) deployArgs.logLevel = logLevel

            // Add flags
            if (reset) deployArgs.reset = true
            if (ci) deployArgs.ci = true

            logger.info('Executing deploy command...')

            // Call the LayerZero deploy task programmatically
            await hre.run('lz:deploy', deployArgs)

            logger.info('✅ Deploy command completed successfully!')
        } catch (error) {
            logger.error('❌ Deploy command failed:', error)
            throw error
        } finally {
            // Restore original MARKET_PAIR environment variable
            if (oldMarketPair === undefined) {
                delete process.env.MARKET_PAIR
            } else {
                process.env.MARKET_PAIR = oldMarketPair
            }
        }
    })

export { deployWrapper }
