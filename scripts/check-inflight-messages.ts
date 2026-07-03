#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

import { EndpointId } from '@layerzerolabs/lz-definitions'

// Standalone, no Hardhat context / RPC / private keys required — safe for anyone to run.
// Keep in sync with hardhat.config.ts's network -> eid map.
const NETWORK_TO_EID: Record<string, EndpointId> = {
    'arbitrum-mainnet': EndpointId.ARBITRUM_V2_MAINNET,
    'base-mainnet': EndpointId.BASE_V2_MAINNET,
    'bera-mainnet': EndpointId.BERA_V2_MAINNET,
    'botanix-mainnet': EndpointId.BOTANIX_V2_MAINNET,
    'bsc-mainnet': EndpointId.BSC_V2_MAINNET,
    'ethereum-mainnet': EndpointId.ETHEREUM_V2_MAINNET,
}

const SCAN_API_BASE = process.env.LZ_SCAN_API_URL || 'https://scan.layerzero-api.com/v1'
const PAGE_LIMIT = 100

// A message is "pending" if it hasn't reached a state where it's either been delivered or
// will never be delivered. PAYLOAD_STORED (DVN already committed, awaiting execution) and
// FAILED (execution attempted and reverted, may still be retryable) both count as pending:
// unpeering while a message sits in either of these states can strand it permanently, since
// delivery never re-checks the receive library or peer once a payload is stored. Everything
// else (DELIVERED, BLOCKED, APPLICATION_BURNED, APPLICATION_SKIPPED) is a terminal state.
const PENDING_STATUSES = new Set([
    'INFLIGHT',
    'CONFIRMING',
    'PAYLOAD_STORED',
    'FAILED',
    'UNRESOLVABLE_COMMAND',
    'MALFORMED_COMMAND',
])

interface ScanMessage {
    guid?: string
    status: { name: string; message?: string }
    created?: string
    pathway?: { srcEid?: number; dstEid?: number }
    source?: { tx?: { txHash?: string } }
}

interface ScanResponse {
    data?: ScanMessage[]
    nextToken?: string
}

function readDeployedContracts(network: string): { file: string; address: string }[] {
    const dir = path.join(process.cwd(), 'deployments', network)
    if (!fs.existsSync(dir)) {
        throw new Error(`No deployments directory found for network '${network}' at ${dir}`)
    }
    return fs
        .readdirSync(dir)
        .filter((f) => /^(GlvToken|MarketToken)_(Adapter|OFT)_.+\.json$/.test(f))
        .map((file) => ({
            file,
            address: JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')).address,
        }))
}

// Returns `complete: false` if the scan API's pagination broke before exhausting all pages.
// The messages collected up to that point are still returned, but the caller must not treat
// an incomplete fetch as grounds for declaring a pathway safe.
async function fetchAllMessagesForOApp(
    eid: EndpointId,
    address: string
): Promise<{ messages: ScanMessage[]; complete: boolean }> {
    const results: ScanMessage[] = []
    let nextToken: string | undefined
    let page = 0

    do {
        const url = new URL(`${SCAN_API_BASE}/messages/oapp/${eid}/${address}`)
        url.searchParams.set('limit', String(PAGE_LIMIT))
        if (nextToken) url.searchParams.set('nextToken', nextToken)

        const res = await fetch(url.toString())
        if (!res.ok) {
            // The scan API 404s (rather than returning an empty 200) when an OApp has no
            // message history at all — a legitimate, common case for a quiet pathway.
            if (page === 0) {
                return { messages: [], complete: true }
            }
            console.warn(
                `WARNING: pagination for ${address} stopped early (page ${page + 1}: ${res.status} ${res.statusText}) — ` +
                    `results for this contract may be incomplete`
            )
            return { messages: results, complete: false }
        }

        const body = (await res.json()) as ScanResponse
        const data = body.data ?? []
        results.push(...data)
        page++

        // The scan API has been observed to return a non-null nextToken even on the last page
        // (when `data.length < limit`); following that cursor 404s. A short page reliably means
        // there's nothing more to fetch, so stop here rather than trusting the cursor's presence.
        nextToken = data.length < PAGE_LIMIT ? undefined : body.nextToken
    } while (nextToken)

    return { messages: results, complete: true }
}

function parseArgs(argv: string[]): { targetNetwork: string } {
    const idx = argv.indexOf('--target-network')
    const targetNetwork = idx >= 0 ? argv[idx + 1] : undefined
    if (!targetNetwork || !NETWORK_TO_EID[targetNetwork]) {
        throw new Error(`--target-network is required and must be one of: ${Object.keys(NETWORK_TO_EID).join(', ')}`)
    }
    return { targetNetwork }
}

async function main() {
    const { targetNetwork } = parseArgs(process.argv.slice(2))
    const targetEid = NETWORK_TO_EID[targetNetwork]

    console.log(`Checking for pending messages on ${targetNetwork} (eid ${targetEid})...\n`)

    let anyPending = false
    let anyIncomplete = false

    for (const { file, address } of readDeployedContracts(targetNetwork)) {
        const { messages, complete } = await fetchAllMessagesForOApp(targetEid, address)
        if (!complete) anyIncomplete = true

        const pending = messages.filter((m) => PENDING_STATUSES.has(m.status?.name))

        if (pending.length === 0) {
            console.log(`${file} | no pending messages`)
            continue
        }

        anyPending = true
        for (const m of pending) {
            const counterpartEid = m.pathway?.srcEid === targetEid ? m.pathway?.dstEid : m.pathway?.srcEid
            console.log(
                `${file} | eid ${targetEid} <-> eid ${counterpartEid ?? 'unknown'} | PENDING (${m.status?.name}) | ` +
                    `guid=${m.guid ?? 'unknown'} tx=${m.source?.tx?.txHash ?? 'unknown'} created=${m.created ?? 'unknown'}`
            )
        }
    }

    console.log()
    if (anyPending) {
        console.log('NOT SAFE to proceed — pending messages found on at least one pathway.')
        process.exitCode = 1
    } else if (anyIncomplete) {
        console.log(
            'INCONCLUSIVE — could not fully verify all pathways (see warnings above). Treat as NOT SAFE until re-checked.'
        )
        process.exitCode = 1
    } else {
        console.log('SAFE to proceed — no pending messages found on any pathway.')
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error)
        process.exit(1)
    })
}
