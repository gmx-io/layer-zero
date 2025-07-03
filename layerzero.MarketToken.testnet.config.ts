import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'
import { TwoWayConfig, generateConnectionsConfig } from '@layerzerolabs/metadata-tools'
import { OAppEnforcedOption } from '@layerzerolabs/toolbox-hardhat'

import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const ethereumSepoliaContract: OmniPointHardhat = {
    eid: EndpointId.SEPOLIA_V2_TESTNET,
    contractName: 'MarketToken_OFT',
}

const arbitrumSepoliaContract: OmniPointHardhat = {
    eid: EndpointId.ARBSEP_V2_TESTNET,
    contractName: 'MarketToken_Adapter',
}

const EVM_ENFORCED_OPTIONS_LZ_RECEIVE: OAppEnforcedOption[] = [
    {
        msgType: 1,
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 80_000,
        value: 0,
    },
]

const EVM_ENFORCED_OPTIONS_LZ_COMPOSE: OAppEnforcedOption[] = [
    {
        msgType: 2,
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 80_000,
        value: 0,
    },
    {
        msgType: 2,
        optionType: ExecutorOptionType.COMPOSE,
        index: 0,
        gas: 8_000_000,
        value: 0,
    },
]

const EVM_ENFORCED_OPTIONS_TO_HUB: OAppEnforcedOption[] = EVM_ENFORCED_OPTIONS_LZ_RECEIVE.concat(
    EVM_ENFORCED_OPTIONS_LZ_COMPOSE
)

const pathways: TwoWayConfig[] = [
    [
        ethereumSepoliaContract, // Chain A contract
        arbitrumSepoliaContract, // Chain B contract
        [['LayerZero Labs'], []], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
        [1, 1], // [A to B confirmations, B to A confirmations]
        [EVM_ENFORCED_OPTIONS_LZ_RECEIVE, EVM_ENFORCED_OPTIONS_TO_HUB], // Chain B enforcedOptions, Chain A enforcedOptions
    ],
]

export default async function () {
    const connections = await generateConnectionsConfig(pathways)
    const config: OAppOmniGraphHardhat = {
        contracts: [
            {
                contract: ethereumSepoliaContract,
                config: {
                    delegate: '0xEc80F80844e110f52b223cAFc5D5D69178D4c62b',
                    owner: '0xEc80F80844e110f52b223cAFc5D5D69178D4c62b',
                },
            },
            {
                contract: arbitrumSepoliaContract,
                config: {
                    delegate: '0xEc80F80844e110f52b223cAFc5D5D69178D4c62b',
                    owner: '0xEc80F80844e110f52b223cAFc5D5D69178D4c62b',
                },
            },
        ],
        connections,
    }

    return config
}
