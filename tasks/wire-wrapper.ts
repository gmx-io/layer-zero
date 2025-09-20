import fs from 'fs'
import path from 'path'

import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'

interface WireArgs {
    marketPair: string
    stage: 'mainnet' | 'testnet'
    tokenType?: 'GM' | 'GLV'
    signer?: string
    gmSigner?: string
    glvSigner?: string
    skipDelegate?: boolean
    generatePayloads?: boolean
    dryRun?: boolean
    assert?: boolean
    ci?: boolean
    logLevel?: string
}

// Helper function to wire a specific token type
async function wireTokenType(
    hre: HardhatRuntimeEnvironment,
    marketPair: string,
    tokenType: 'GM' | 'GLV',
    stage: 'mainnet' | 'testnet',
    signer: string | undefined,
    skipDelegate: boolean,
    generatePayloads: boolean,
    dryRun: boolean,
    assert: boolean,
    ci: boolean,
    logLevel: string,
    logger: ReturnType<typeof createModuleLogger>
): Promise<void> {
    // Determine config file based on token type
    const configFile = tokenType === 'GM' ? `layerzero.gm.${stage}.config.ts` : `layerzero.glv.${stage}.config.ts`

    // Determine signer address - use provided signer or auto-detect from HRE named accounts
    let signerAddress: string
    if (signer) {
        signerAddress = signer
    } else {
        // Get signer from HRE named accounts
        const { deployerGM, deployerGLV } = await hre.getNamedAccounts()
        logger.verbose(`Named accounts: deployerGM: ${deployerGM}, deployerGLV: ${deployerGLV}`)
        const autoSigner = tokenType === 'GM' ? deployerGM : deployerGLV

        if (!autoSigner) {
            throw new Error(
                `No ${tokenType === 'GM' ? 'deployerGM' : 'deployerGLV'} account found in named accounts. Provide --signer flag or configure named accounts in hardhat.config.ts.`
            )
        }
        signerAddress = autoSigner
    }

    logger.info(`Wiring ${tokenType} contracts for ${marketPair}`)
    logger.verbose(`Config: ${configFile}`)
    logger.info(`Signer: ${signerAddress}`)
    // Force delegate when generatePayloads is enabled
    const effectiveSkipDelegate = generatePayloads ? false : skipDelegate
    logger.info(`Delegate: ${effectiveSkipDelegate ? 'No' : 'Yes'}`)
    if (generatePayloads && skipDelegate) {
        logger.info('⚠️  Overriding --skip-delegate because --generate-payloads requires delegation')
    }

    // Generate output filename if generatePayloads is enabled
    let outputFilename: string | undefined
    if (generatePayloads) {
        // Create payloads directory if it doesn't exist
        const payloadsDir = path.join(process.cwd(), 'payloads')
        if (!fs.existsSync(payloadsDir)) {
            fs.mkdirSync(payloadsDir, { recursive: true })
            logger.info(`Created payloads directory: ${payloadsDir}`)
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        const delegateStr = effectiveSkipDelegate ? '-no-delegate' : '-delegated'
        outputFilename = path.join(
            payloadsDir,
            `wire-payloads-${marketPair}-${tokenType}${delegateStr}-${timestamp}.json`
        )
        logger.info(`Payloads will be saved to: ${outputFilename}`)
    }

    // Set environment variables for the wire process
    const oldEnvVars: Record<string, string | undefined> = {}

    try {
        // Backup and set environment variables
        oldEnvVars.MARKET_PAIR = process.env.MARKET_PAIR
        oldEnvVars.TOKEN_TYPE = process.env.TOKEN_TYPE
        oldEnvVars.SKIP_DELEGATE = process.env.SKIP_DELEGATE

        process.env.MARKET_PAIR = marketPair
        process.env.TOKEN_TYPE = tokenType
        if (effectiveSkipDelegate) {
            process.env.SET_DELEGATE = '1'
        }

        // Prepare arguments for the LayerZero wire command
        const wireArgs: Record<string, string | boolean | object> = {
            oappConfig: configFile,
            signer: signer
                ? { type: 'address', address: signerAddress }
                : { type: 'name', name: tokenType === 'GM' ? 'deployerGM' : 'deployerGLV' },
        }

        // Add optional flags
        if (outputFilename) wireArgs.outputFilename = outputFilename
        if (dryRun) wireArgs.dryRun = true
        if (assert) wireArgs.assert = true
        if (ci) wireArgs.ci = true

        logger.info('Executing wire command...')

        // Call the LayerZero wire task programmatically
        await hre.run('lz:oapp:wire', wireArgs)

        logger.info('✅ Wire command completed successfully!')
    } catch (error) {
        logger.error('❌ Wire command failed:', error)
        throw error
    } finally {
        // Restore original environment variables
        for (const [key, value] of Object.entries(oldEnvVars)) {
            if (value === undefined) {
                delete process.env[key]
            } else {
                process.env[key] = value
            }
        }
        // Clean up SET_DELEGATE if it was set
        if (effectiveSkipDelegate && !oldEnvVars.SKIP_DELEGATE) {
            delete process.env.SET_DELEGATE
        }
    }
}

const wire = task('lz:sdk:wire', 'Wire LayerZero contracts with automatic config and signer selection')
    .addParam('marketPair', 'Market pair to wire (e.g., WETH_USDC)')
    .addOptionalParam('stage', 'Stage to wire (e.g., mainnet or testnet)', 'mainnet')
    .addOptionalParam('tokenType', 'Token type to wire (GM or GLV). If not specified, wires both.')
    .addOptionalParam('signer', 'Public key/address of signer (overrides automatic selection)')
    .addOptionalParam('gmSigner', 'Public key/address of signer for GM contracts (only used when wiring both)')
    .addOptionalParam('glvSigner', 'Public key/address of signer for GLV contracts (only used when wiring both)')
    .addOptionalParam('logLevel', 'Logging level (error, warn, info, verbose, debug, silly)', 'info')
    .addFlag('skipDelegate', 'Skip ownership delegation to predefined addresses')
    .addFlag('generatePayloads', 'Generate transaction payloads and save to JSON file')
    .addFlag('dryRun', 'Perform dry run without executing transactions')
    .addFlag('assert', 'Assert mode - fail if transactions are required')
    .addFlag('ci', 'Continuous integration mode (non-interactive)')
    .setAction(async (taskArgs: WireArgs, hre: HardhatRuntimeEnvironment) => {
        const {
            marketPair,
            stage,
            tokenType,
            signer,
            gmSigner,
            glvSigner,
            skipDelegate,
            generatePayloads,
            dryRun,
            assert,
            ci,
            logLevel,
        } = taskArgs

        setDefaultLogLevel(logLevel || 'info')
        const logger = createModuleLogger('wire', logLevel || 'info')

        // Validate token type if provided
        if (tokenType && !['GM', 'GLV'].includes(tokenType)) {
            throw new Error(`Invalid token type: ${tokenType}. Must be GM or GLV`)
        }

        const wireType = tokenType ? `${tokenType} contracts` : 'all contracts'
        logger.info(`Wiring ${wireType} for ${marketPair}`)

        try {
            if (tokenType) {
                // Wire specific token type
                await wireTokenType(
                    hre,
                    marketPair,
                    tokenType,
                    stage,
                    signer,
                    skipDelegate || false,
                    generatePayloads || false,
                    dryRun || false,
                    assert || false,
                    ci || false,
                    logLevel || 'info',
                    logger
                )
            } else {
                // Wire both GM and GLV
                const tokenTypes: ('GM' | 'GLV')[] = ['GM', 'GLV']

                for (const type of tokenTypes) {
                    // Determine signer based on token type
                    let actualSigner: string | undefined
                    if (type === 'GM') {
                        actualSigner = gmSigner || signer
                    } else {
                        actualSigner = glvSigner || signer
                    }

                    await wireTokenType(
                        hre,
                        marketPair,
                        type,
                        stage,
                        actualSigner,
                        skipDelegate || false,
                        generatePayloads || false,
                        dryRun || false,
                        assert || false,
                        ci || false,
                        logLevel || 'info',
                        logger
                    )
                }
            }

            logger.info('✅ All wiring completed successfully!')
        } catch (error) {
            logger.error('❌ Wiring failed:', error)
            throw error
        }
    })

export { wire }
