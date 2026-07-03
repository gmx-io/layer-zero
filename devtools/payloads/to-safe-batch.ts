import fs from 'fs'
import path from 'path'

import { getNetworkNameForEid } from '@layerzerolabs/devtools-evm-hardhat'

import { OwnershipTransfer } from '../config'

import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { HardhatRuntimeEnvironment } from 'hardhat/types'

// Matches the shape LayerZero's `lz:oapp:wire` task writes via `--output-filename` /
// `--generate-payloads` (a raw dump of `OmniTransaction[]`), which is not directly importable
// into Safe's Transaction Builder.
interface RawOmniTransaction {
    point: { eid: EndpointId; address: string }
    data: string
    description?: string
    value?: string | number
}

interface SafeBatchTransaction {
    to: string
    value: string
    data: string
    contractMethod: null
    contractInputsValues: null
}

interface SafeBatchFile {
    version: string
    chainId: string
    createdAt: number
    meta: {
        name: string
        description: string
        txBuilderVersion: string
        createdFromSafeAddress?: string
    }
    transactions: SafeBatchTransaction[]
}

function getNativeChainId(networkName: string): string {
    const chainIdPath = path.join(process.cwd(), 'deployments', networkName, '.chainId')
    if (!fs.existsSync(chainIdPath)) {
        throw new Error(`No .chainId file found for network '${networkName}' at ${chainIdPath}`)
    }
    return fs.readFileSync(chainIdPath, 'utf8').trim()
}

/**
 * Groups raw OmniTransactions (as written by `lz:oapp:wire --generate-payloads`) by native
 * chain id, producing one Gnosis Safe Transaction Builder batch per chain. Multiple input
 * files' transactions can be concatenated by the caller before calling this (e.g. to combine
 * a receive-block phase and an unpeer phase into a single atomic Safe batch).
 */
export function groupTransactionsByChain(
    transactions: RawOmniTransaction[],
    hre: HardhatRuntimeEnvironment,
    meta: { name: string; description: string }
): Map<string, SafeBatchFile> {
    const batches = new Map<string, SafeBatchFile>()
    // Guards against duplicate input files (e.g. an --input glob matching more than one
    // timestamped run of the same market pair/phase left over in payloads/) silently doubling
    // up a call in the Safe batch. Two transactions with the same target contract and calldata
    // are always the same intended change, so it's safe to keep only one.
    const seenPerChain = new Map<string, Set<string>>()
    let duplicatesDropped = 0

    for (const tx of transactions) {
        const networkName = getNetworkNameForEid(tx.point.eid, hre)
        const chainId = getNativeChainId(networkName)

        const seen = seenPerChain.get(chainId) ?? new Set<string>()
        seenPerChain.set(chainId, seen)
        const dedupeKey = `${tx.point.address.toLowerCase()}:${tx.data.toLowerCase()}`
        if (seen.has(dedupeKey)) {
            duplicatesDropped++
            continue
        }
        seen.add(dedupeKey)

        let batch = batches.get(chainId)
        if (!batch) {
            batch = {
                version: '1.0',
                chainId,
                createdAt: Date.now(),
                meta: {
                    name: meta.name,
                    description: meta.description,
                    txBuilderVersion: '1.16.5',
                    createdFromSafeAddress: OwnershipTransfer[tx.point.eid],
                },
                transactions: [],
            }
            batches.set(chainId, batch)
        }

        batch.transactions.push({
            to: tx.point.address,
            value: String(tx.value ?? '0'),
            data: tx.data,
            contractMethod: null,
            contractInputsValues: null,
        })
    }

    if (duplicatesDropped > 0) {
        console.warn(
            `WARNING: dropped ${duplicatesDropped} duplicate transaction(s) (identical target + calldata) — ` +
                `check your --input glob isn't matching multiple stale runs of the same market pair/phase in payloads/`
        )
    }

    return batches
}

export function writeSafeBatchFiles(
    batches: Map<string, SafeBatchFile>,
    outputDir: string,
    filePrefix: string
): string[] {
    fs.mkdirSync(outputDir, { recursive: true })
    const written: string[] = []

    for (const [chainId, batch] of batches) {
        const filePath = path.join(outputDir, `${filePrefix}-chain-${chainId}.json`)
        fs.writeFileSync(filePath, JSON.stringify(batch, null, 2))
        written.push(filePath)
    }

    return written
}
