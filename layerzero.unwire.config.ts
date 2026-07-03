import { EndpointId } from '@layerzerolabs/lz-definitions'

import { UnwirePhase, generateUnwireConfig } from './devtools'

export default async function () {
    const contractType = process.env.CONTRACT_TYPE as 'MarketToken' | 'GlvToken' | undefined
    const targetEid = process.env.TARGET_EID ? (Number(process.env.TARGET_EID) as EndpointId) : undefined
    const phase = process.env.PHASE as UnwirePhase | undefined

    if (!contractType || !targetEid || !phase) {
        throw new Error(
            'layerzero.unwire.config.ts requires CONTRACT_TYPE, TARGET_EID and PHASE environment variables ' +
                '(set automatically by `npx hardhat lz:sdk:unwire`)'
        )
    }

    const unwireConfig = await generateUnwireConfig(contractType, targetEid, phase)

    return {
        contracts: unwireConfig.contracts,
        connections: unwireConfig.connections,
    }
}
