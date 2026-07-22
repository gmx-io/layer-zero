import fs from 'fs'
import path from 'path'

import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { getEidForNetworkName } from '@layerzerolabs/devtools-evm-hardhat'
import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'

import { hasDeploymentArtifact } from '../devtools/wire/unwire-generator'

import type { UnwirePhase } from '../devtools/wire/unwire-generator'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

const PHASES: UnwirePhase[] = ['send-block', 'receive-block', 'unpeer']

interface UnwireArgs {
    targetNetwork: string
    phase: string
    marketPair?: string
    tokenType?: 'GM' | 'GLV'
    signer?: string
    generatePayloads?: boolean
    dryRun?: boolean
    assert?: boolean
    ci?: boolean
    logLevel?: string
}

function contractNameFor(tokenType: 'GM' | 'GLV', marketPair: string): string {
    const contractType = tokenType === 'GM' ? 'MarketToken' : 'GlvToken'
    return `${contractType}_OFT_${marketPair}`
}

// Determine which (marketPair, tokenType) combos are actually deployed on the target network.
// Deliberately checks deployment artifacts on disk rather than `ExpansionNetworks` membership,
// since the target network is expected to already have been removed from that config (see
// devtools/config/networks.ts) by the time this task is used for real.
async function resolveCombos(
    targetNetwork: string,
    marketPair: string | undefined,
    tokenType: 'GM' | 'GLV' | undefined,
    logger: ReturnType<typeof createModuleLogger>
): Promise<{ marketPair: string; tokenType: 'GM' | 'GLV' }[]> {
    const { Tokens } = await import('../devtools/config/tokens')
    const { getAvailableTokenTypes } = await import('../devtools/deploy/utils')

    const marketPairs = marketPair ? [marketPair] : Object.keys(Tokens)
    const combos: { marketPair: string; tokenType: 'GM' | 'GLV' }[] = []

    for (const pair of marketPairs) {
        const availableTypes = tokenType ? [tokenType] : await getAvailableTokenTypes(pair)
        for (const type of availableTypes) {
            if (!Tokens[pair][type]) continue
            if (hasDeploymentArtifact(targetNetwork, contractNameFor(type, pair))) {
                combos.push({ marketPair: pair, tokenType: type })
            } else {
                logger.verbose(`Skipping ${pair} (${type}) — no deployment on ${targetNetwork}`)
            }
        }
    }

    return combos
}

async function unwireTokenType(
    hre: HardhatRuntimeEnvironment,
    targetNetwork: string,
    targetEid: EndpointId,
    phase: UnwirePhase,
    marketPair: string,
    tokenType: 'GM' | 'GLV',
    signer: string | undefined,
    generatePayloads: boolean,
    dryRun: boolean,
    assert: boolean,
    ci: boolean,
    logLevel: string,
    logger: ReturnType<typeof createModuleLogger>
): Promise<void> {
    let signerAddress: string
    if (signer) {
        signerAddress = signer
    } else {
        const { deployerGM, deployerGLV } = await hre.getNamedAccounts()
        const autoSigner = tokenType === 'GM' ? deployerGM : deployerGLV
        if (!autoSigner) {
            throw new Error(
                `No ${tokenType === 'GM' ? 'deployerGM' : 'deployerGLV'} account found in named accounts. Provide --signer flag or configure named accounts in hardhat.config.ts.`
            )
        }
        signerAddress = autoSigner
    }

    logger.info(`Unwiring ${tokenType} contracts for ${marketPair} against ${targetNetwork} (phase: ${phase})`)
    logger.info(`Signer: ${signerAddress}`)

    let outputFilename: string | undefined
    if (generatePayloads) {
        const payloadsDir = path.join(process.cwd(), 'payloads')
        if (!fs.existsSync(payloadsDir)) {
            fs.mkdirSync(payloadsDir, { recursive: true })
            logger.info(`Created payloads directory: ${payloadsDir}`)
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        outputFilename = path.join(
            payloadsDir,
            `unwire-payloads-${phase}-${targetNetwork}-${marketPair}-${tokenType}-${timestamp}.json`
        )
        logger.info(`Payloads will be saved to: ${outputFilename}`)
    }

    const oldEnvVars: Record<string, string | undefined> = {}

    try {
        oldEnvVars.MARKET_PAIR = process.env.MARKET_PAIR
        oldEnvVars.TOKEN_TYPE = process.env.TOKEN_TYPE
        oldEnvVars.CONTRACT_TYPE = process.env.CONTRACT_TYPE
        oldEnvVars.TARGET_EID = process.env.TARGET_EID
        oldEnvVars.PHASE = process.env.PHASE
        oldEnvVars.SET_DELEGATE = process.env.SET_DELEGATE

        process.env.MARKET_PAIR = marketPair
        process.env.TOKEN_TYPE = tokenType
        process.env.CONTRACT_TYPE = tokenType === 'GM' ? 'MarketToken' : 'GlvToken'
        process.env.TARGET_EID = String(targetEid)
        process.env.PHASE = phase
        // Ownership/delegate config must resolve the same way it does for normal wiring so the
        // no-op ownership configurator sees a match — always delegate for the unwire flow.
        process.env.SET_DELEGATE = '1'

        const wireArgs: Record<string, string | boolean | object> = {
            oappConfig: 'layerzero.unwire.config.ts',
            signer: signer
                ? { type: 'address', address: signerAddress }
                : { type: 'name', name: tokenType === 'GM' ? 'deployerGM' : 'deployerGLV' },
        }

        if (outputFilename) wireArgs.outputFilename = outputFilename
        if (dryRun) wireArgs.dryRun = true
        if (assert) wireArgs.assert = true
        if (ci) wireArgs.ci = true

        await hre.run('lz:oapp:wire', wireArgs)

        logger.info('✅ Unwire command completed successfully!')
    } catch (error) {
        logger.error('❌ Unwire command failed:', error)
        throw error
    } finally {
        for (const [key, value] of Object.entries(oldEnvVars)) {
            if (value === undefined) {
                delete process.env[key]
            } else {
                process.env[key] = value
            }
        }
    }
}

const unwire = task('lz:sdk:unwire', 'Generate LayerZero unwire (chain-removal) transactions for a target network')
    .addParam('targetNetwork', 'Hardhat network name of the chain being removed (e.g., botanix-mainnet)')
    .addParam('phase', `Unwire phase: ${PHASES.join(' | ')}`)
    .addOptionalParam(
        'marketPair',
        'Market pair to unwire (e.g., WETH_USDC). If not specified, all deployed pairs are processed.'
    )
    .addOptionalParam('tokenType', 'Token type to unwire (GM or GLV). If not specified, wires both.')
    .addOptionalParam('signer', 'Public key/address of signer (overrides automatic selection)')
    .addOptionalParam('logLevel', 'Logging level (error, warn, info, verbose, debug, silly)', 'info')
    .addFlag('generatePayloads', 'Generate transaction payloads and save to JSON file')
    .addFlag('dryRun', 'Perform dry run without executing transactions')
    .addFlag('assert', 'Assert mode - fail if transactions are required')
    .addFlag('ci', 'Continuous integration mode (non-interactive)')
    .setAction(async (taskArgs: UnwireArgs, hre: HardhatRuntimeEnvironment) => {
        const { targetNetwork, phase, marketPair, tokenType, signer, generatePayloads, dryRun, assert, ci, logLevel } =
            taskArgs

        setDefaultLogLevel(logLevel || 'info')
        const logger = createModuleLogger('unwire', logLevel || 'info')

        if (!PHASES.includes(phase as UnwirePhase)) {
            throw new Error(`Invalid phase: ${phase}. Must be one of: ${PHASES.join(', ')}`)
        }
        if (tokenType && !['GM', 'GLV'].includes(tokenType)) {
            throw new Error(`Invalid token type: ${tokenType}. Must be GM or GLV`)
        }

        const targetEid = getEidForNetworkName(targetNetwork, hre)
        const combos = await resolveCombos(targetNetwork, marketPair, tokenType, logger)

        if (combos.length === 0) {
            throw new Error(`No deployed market pairs found for ${targetNetwork} matching the given filters`)
        }

        logger.info(`Unwiring ${combos.length} contract(s) for ${targetNetwork} (eid ${targetEid}), phase: ${phase}`)

        try {
            for (const combo of combos) {
                await unwireTokenType(
                    hre,
                    targetNetwork,
                    targetEid,
                    phase as UnwirePhase,
                    combo.marketPair,
                    combo.tokenType,
                    signer,
                    generatePayloads || false,
                    dryRun || false,
                    assert || false,
                    ci || false,
                    logLevel || 'info',
                    logger
                )
            }

            logger.info('✅ All unwiring completed successfully!')
        } catch (error) {
            logger.error('❌ Unwiring failed:', error)
            throw error
        }
    })

export { unwire }
