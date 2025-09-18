import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'
import { OAppEnforcedOption } from '@layerzerolabs/toolbox-hardhat'

/**
 * LayerZero enforced options for different message types
 */
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

/**
 * Enforced options for spoke-to-spoke communication
 */
export const EVM_ENFORCED_OPTIONS_TO_SPOKE: OAppEnforcedOption[] = EVM_ENFORCED_OPTIONS_LZ_RECEIVE

/**
 * Enforced options for spoke-to-hub communication (includes compose)
 */
export const EVM_ENFORCED_OPTIONS_TO_HUB: OAppEnforcedOption[] = EVM_ENFORCED_OPTIONS_LZ_RECEIVE.concat(
    EVM_ENFORCED_OPTIONS_LZ_COMPOSE
)

/**
 * Common DVN configurations
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DVNConfigs: Record<string, [string[], any[]]> = {
    testnet: [['LayerZero Labs'], []],
    mainnet: [
        ['LayerZero Labs', 'Canary'],
        [['Deutsche Telekom', 'Horizen'], 1],
    ],
}
