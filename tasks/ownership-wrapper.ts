import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'

interface OwnershipArgs {
    marketPair: string
    tokenType?: 'GM' | 'GLV'
    signer?: string
    gmSigner?: string
    glvSigner?: string
    safe?: boolean
    dryRun?: boolean
    assert?: boolean
    ci?: boolean
    logLevel?: string
}

// Helper function to transfer ownership for a specific token type
async function transferOwnershipForTokenType(
    hre: HardhatRuntimeEnvironment,
    marketPair: string,
    tokenType: 'GM' | 'GLV',
    signer: string | undefined,
    safe: boolean,
    dryRun: boolean,
    assert: boolean,
    ci: boolean,
    logLevel: string,
    logger: ReturnType<typeof createModuleLogger>
): Promise<void> {
    // Determine config file based on token type
    const configFile = tokenType === 'GM' ? 'layerzero.gm.mainnet.config.ts' : 'layerzero.glv.mainnet.config.ts'

    // Determine signer address - use provided signer or auto-detect from HRE named accounts
    let signerAddress: string
    if (signer) {
        signerAddress = signer
    } else {
        // Get signer from HRE named accounts
        const { deployerGM, deployerGLV } = await hre.getNamedAccounts()
        const autoSigner = tokenType === 'GM' ? deployerGM : deployerGLV

        if (!autoSigner) {
            throw new Error(
                `No ${tokenType === 'GM' ? 'deployerGM' : 'deployerGLV'} account found in named accounts. Provide --signer flag or configure named accounts in hardhat.config.ts.`
            )
        }
        signerAddress = autoSigner
    }

    logger.info(`Transferring ownership for ${tokenType} contracts for ${marketPair}`)
    logger.info(`Config: ${configFile}`)
    logger.info(`Signer: ${signerAddress}`)
    logger.info(`Safe: ${safe ? 'Yes' : 'No'}`)

    try {
        // Prepare arguments for the LayerZero ownership transfer command
        const ownershipArgs: Record<string, string | boolean> = {
            oappConfig: configFile,
            signer: signerAddress,
        }

        // Add optional flags
        if (safe) ownershipArgs.safe = true
        if (dryRun) ownershipArgs.dryRun = true
        if (assert) ownershipArgs.assert = true
        if (ci) ownershipArgs.ci = true

        logger.info('Executing ownership transfer command...')

        // Call the LayerZero ownership transfer task programmatically
        await hre.run('lz:ownable:transfer-ownership', ownershipArgs)

        logger.info('✅ Ownership transfer completed successfully!')
    } catch (error) {
        logger.error('❌ Ownership transfer failed:', error)
        throw error
    }
}

const transferOwnership = task(
    'lz:sdk:transfer-ownership',
    'Transfer LayerZero contract ownership with automatic config and signer selection'
)
    .addParam('marketPair', 'Market pair to transfer ownership for (e.g., WETH_USDC)')
    .addOptionalParam(
        'tokenType',
        'Token type to transfer ownership for (GM or GLV). If not specified, transfers both.'
    )
    .addOptionalParam('signer', 'Public key/address of signer (overrides automatic selection)')
    .addOptionalParam('gmSigner', 'Public key/address of signer for GM contracts (only used when transferring both)')
    .addOptionalParam('glvSigner', 'Public key/address of signer for GLV contracts (only used when transferring both)')
    .addOptionalParam('logLevel', 'Logging level (error, warn, info, verbose, debug, silly)', 'info')
    .addFlag('safe', 'Use Gnosis Safe to sign transactions')
    .addFlag('dryRun', 'Perform dry run without executing transactions')
    .addFlag('assert', 'Assert mode - fail if transactions are required')
    .addFlag('ci', 'Continuous integration mode (non-interactive)')
    .setAction(async (taskArgs: OwnershipArgs, hre: HardhatRuntimeEnvironment) => {
        const { marketPair, tokenType, signer, gmSigner, glvSigner, safe, dryRun, assert, ci, logLevel } = taskArgs

        setDefaultLogLevel(logLevel || 'info')
        const logger = createModuleLogger('transfer-ownership', logLevel || 'info')

        // Validate token type if provided
        if (tokenType && !['GM', 'GLV'].includes(tokenType)) {
            throw new Error(`Invalid token type: ${tokenType}. Must be GM or GLV`)
        }

        const transferType = tokenType ? `${tokenType} contracts` : 'all contracts'
        logger.info(`Transferring ownership for ${transferType} for ${marketPair}`)

        try {
            if (tokenType) {
                // Transfer ownership for specific token type
                await transferOwnershipForTokenType(
                    hre,
                    marketPair,
                    tokenType,
                    signer,
                    safe || false,
                    dryRun || false,
                    assert || false,
                    ci || false,
                    logLevel || 'info',
                    logger
                )
            } else {
                // Transfer ownership for both GM and GLV
                const tokenTypes: ('GM' | 'GLV')[] = ['GM', 'GLV']

                for (const type of tokenTypes) {
                    // Determine signer based on token type
                    let actualSigner: string | undefined
                    if (type === 'GM') {
                        actualSigner = gmSigner || signer
                    } else {
                        actualSigner = glvSigner || signer
                    }

                    await transferOwnershipForTokenType(
                        hre,
                        marketPair,
                        type,
                        actualSigner,
                        safe || false,
                        dryRun || false,
                        assert || false,
                        ci || false,
                        logLevel || 'info',
                        logger
                    )
                }
            }

            logger.info('✅ All ownership transfers completed successfully!')
        } catch (error) {
            logger.error('❌ Ownership transfer failed:', error)
            throw error
        }
    })

export { transferOwnership }
