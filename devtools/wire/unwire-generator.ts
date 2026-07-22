import fs from 'fs'
import path from 'path'

import { constants } from 'ethers'

import { getNetworkNameForEid } from '@layerzerolabs/devtools-evm-hardhat'

import { UnwiredNetworks } from '../config'
import { getDeployConfig, validateHubNetworksNotInExpansion } from '../deploy'
import { MarketPairConfig } from '../types'

import { getBlockedLibraryAddress } from './blocked-library'
import { createContracts } from './wire-generator'

import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

/**
 * The three stages used to remove a chain from the mesh, in order:
 * 1. send-block: point sendLibrary at the BlockedMessageLib on both directions.
 *    Stops new messages without endangering anything already in flight.
 * 2. (not a config phase) drain: wait until scan API shows no pending messages.
 * 3. receive-block: point receiveLibraryConfig.receiveLibrary at the BlockedMessageLib.
 * 4. unpeer: setPeer(eid, bytes32(0)) on both directions.
 */
export type UnwirePhase = 'send-block' | 'receive-block' | 'unpeer'

export function hasDeploymentArtifact(networkName: string, contractName: string): boolean {
    const artifactPath = path.join(process.cwd(), 'deployments', networkName, `${contractName}.json`)
    return fs.existsSync(artifactPath)
}

/**
 * Generates a config graph that only touches the pathways between `targetEid` and every
 * other network in the given market pair's mesh, setting only the config field(s) relevant
 * to `phase`. Every other config axis (DVN/ULN config, enforced options) is left `undefined`,
 * so the existing per-field configurators skip them, exactly as they do for any connection
 * with an omitted field.
 *
 * `targetEid` must be listed in `UnwiredNetworks` (see devtools/config/networks.ts) — this is
 * a deliberate guard rail so an active, still-wired network can't be accidentally targeted.
 * Marking a network there is also what stops routine `lz:sdk:wire` runs from reverting this
 * teardown mid-flight, without needing to remove it from `ExpansionNetworks`/`hardhat.config.ts`.
 */
export async function generateUnwireConfig(
    contractType: 'GlvToken' | 'MarketToken',
    targetEid: EndpointId,
    phase: UnwirePhase,
    marketPairKey?: string,
    marketPairConfig?: MarketPairConfig
): Promise<OAppOmniGraphHardhat> {
    const isMarkedUnwired = [...UnwiredNetworks.mainnet, ...UnwiredNetworks.testnet].includes(targetEid)
    if (!isMarkedUnwired) {
        throw new Error(
            `EID ${targetEid} is not listed in UnwiredNetworks (devtools/config/networks.ts). ` +
                `Add it there first — this is a safety check to prevent unwiring an active network by mistake.`
        )
    }

    const config = marketPairConfig || (await getDeployConfig()).marketPairConfig
    const key = marketPairKey || (await getDeployConfig()).marketPairKey

    validateHubNetworksNotInExpansion(config)

    const tokenConfig = contractType === 'GlvToken' ? config.GLV : config.GM
    if (!tokenConfig) {
        throw new Error(`${contractType === 'GlvToken' ? 'GLV' : 'GM'} token is not configured for market pair ${key}`)
    }

    if (targetEid === tokenConfig.hubNetwork.eid) {
        throw new Error(`Target EID ${targetEid} is the hub network for ${key}; hub removal is not supported`)
    }

    const adapterContractName = `${contractType}_Adapter_${key}`
    const oftContractName = `${contractType}_OFT_${key}`
    const toPoint = (eid: EndpointId): OmniPointHardhat => ({
        eid,
        contractName: tokenConfig.hubNetwork.eid === eid ? adapterContractName : oftContractName,
    })

    const targetNetworkName = getNetworkNameForEid(targetEid)
    const targetContractName = tokenConfig.hubNetwork.eid === targetEid ? adapterContractName : oftContractName
    if (!hasDeploymentArtifact(targetNetworkName, targetContractName)) {
        throw new Error(
            `No deployment artifact found for ${targetContractName} on ${targetNetworkName} (deployments/${targetNetworkName}/${targetContractName}.json); ` +
                `this market pair/token type was never deployed to the target network`
        )
    }

    const counterpartEids = [tokenConfig.hubNetwork.eid, ...tokenConfig.expansionNetworks].filter(
        (eid) => eid !== targetEid
    )

    const targetPoint = toPoint(targetEid)
    const counterpartPoints = counterpartEids.map(toPoint)

    const contracts = createContracts([targetPoint, ...counterpartPoints])

    const blockedLibByEid = new Map<EndpointId, string>()
    if (phase !== 'unpeer') {
        for (const eid of [targetEid, ...counterpartEids]) {
            blockedLibByEid.set(eid, await getBlockedLibraryAddress(eid))
        }
    }

    const getBlockedLib = (eid: EndpointId): string => {
        const address = blockedLibByEid.get(eid)
        if (!address) throw new Error(`No blocked library address resolved for eid ${eid}`)
        return address
    }

    const buildEdge = (from: OmniPointHardhat, to: OmniPointHardhat): OAppOmniGraphHardhat['connections'][number] => {
        if (phase === 'unpeer') {
            return { from, to: { eid: to.eid, address: constants.AddressZero }, config: {} }
        }
        if (phase === 'send-block') {
            return { from, to, config: { sendLibrary: getBlockedLib(from.eid) } }
        }
        return {
            from,
            to,
            config: {
                receiveLibraryConfig: { receiveLibrary: getBlockedLib(from.eid), gracePeriod: BigInt(0) },
            },
        }
    }

    const connections: OAppOmniGraphHardhat['connections'] = []
    for (const counterpart of counterpartPoints) {
        connections.push(buildEdge(targetPoint, counterpart))
        connections.push(buildEdge(counterpart, targetPoint))
    }

    return { contracts, connections }
}
