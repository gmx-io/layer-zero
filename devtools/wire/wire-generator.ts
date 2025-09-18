import { TwoWayConfig, generateConnectionsConfig } from '@layerzerolabs/metadata-tools'
import { OAppEnforcedOption } from '@layerzerolabs/toolbox-hardhat'

import {
    BlockConfirmations,
    EVM_ENFORCED_OPTIONS_TO_HUB,
    EVM_ENFORCED_OPTIONS_TO_SPOKE,
    OwnershipTransfer,
} from '../config'
import { getDeployConfig, validateHubNetworksNotInExpansion } from '../deploy'
import { MarketPairConfig } from '../types'

import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

/**
 * Creates contract configurations for deployment
 */
function createContracts(contractsToWire: OmniPointHardhat[]): OAppOmniGraphHardhat['contracts'] {
    return contractsToWire.map((contract) => ({
        contract,
        config: {
            owner: OwnershipTransfer[contract.eid],
            delegate: OwnershipTransfer[contract.eid],
        },
    }))
}

/**
 * Determines enforced options based on hub/spoke relationship
 */
function getEnforcedOptions(
    contractA: OmniPointHardhat,
    contractB: OmniPointHardhat,
    hubEid: number
): OAppEnforcedOption[][] {
    const isAHub = contractA.eid === hubEid
    const isBHub = contractB.eid === hubEid

    /// TODO: If we have Eid based overrides, they can be implemented here
    if (isAHub && !isBHub) {
        // A is hub, B is spoke: [spoke-to-hub, hub-to-spoke]
        return [EVM_ENFORCED_OPTIONS_TO_SPOKE, EVM_ENFORCED_OPTIONS_TO_HUB]
    } else if (!isAHub && isBHub) {
        // A is spoke, B is hub: [spoke-to-hub, hub-to-spoke]
        return [EVM_ENFORCED_OPTIONS_TO_HUB, EVM_ENFORCED_OPTIONS_TO_SPOKE]
    } else {
        // Both are spokes: [spoke-to-spoke, spoke-to-spoke]
        return [EVM_ENFORCED_OPTIONS_TO_SPOKE, EVM_ENFORCED_OPTIONS_TO_SPOKE]
    }
}

/**
 * Creates pathways between all contract pairs
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPathways(contractsToWire: OmniPointHardhat[], dvns: any[], hubEid: number): TwoWayConfig[] {
    const pathways: TwoWayConfig[] = []

    for (const [i, contractA] of contractsToWire.entries()) {
        for (const [j, contractB] of contractsToWire.entries()) {
            if (i < j) {
                const enforcedOptions = getEnforcedOptions(contractA, contractB, hubEid)

                /// Right now we assume that the dvns are the same for all pathways
                /// In the event that they are not, overrides need to be implemented
                pathways.push([
                    contractA,
                    contractB,
                    dvns,
                    [BlockConfirmations[contractA.eid], BlockConfirmations[contractB.eid]],
                    enforcedOptions,
                ] as TwoWayConfig)
            }
        }
    }

    return pathways
}

/**
 * Generates wire configuration for a specific token type
 */
export async function generateWireConfig(
    contractType: 'GlvToken' | 'MarketToken',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dvns: any[],
    marketPairKey?: string,
    marketPairConfig?: MarketPairConfig
): Promise<OAppOmniGraphHardhat> {
    // Get config if not provided
    const config = marketPairConfig || (await getDeployConfig()).marketPairConfig
    const key = marketPairKey || (await getDeployConfig()).marketPairKey

    // Validate that hub networks are not in the expansion networks
    validateHubNetworksNotInExpansion(config)

    // Determine token type and contract names
    const tokenConfig = contractType === 'GlvToken' ? config.GLV : config.GM
    const adapterContractName = `${contractType}_Adapter_${key}`
    const oftContractName = `${contractType}_OFT_${key}`

    // Include both hub network and expansion networks
    const allNetworkEids = [tokenConfig.hubNetwork.eid, ...tokenConfig.expansionNetworks]
    const contractsToWire = allNetworkEids.map(
        (eid): OmniPointHardhat => ({
            eid,
            contractName: tokenConfig.hubNetwork.eid === eid ? adapterContractName : oftContractName,
        })
    )

    // Create contracts and pathways
    const contracts = createContracts(contractsToWire)
    const pathways = createPathways(contractsToWire, dvns, tokenConfig.hubNetwork.eid)

    // Generate the connections config based on the pathways
    const connections = await generateConnectionsConfig(pathways)

    return {
        contracts,
        connections,
    }
}
