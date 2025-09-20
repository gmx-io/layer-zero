import { DVNConfigs, generateWireConfig } from './devtools'

export default async function () {
    // Generate wire configs for both token types
    /// Using default mainnet dvns
    const glvWireConfig = await generateWireConfig('GlvToken', DVNConfigs.testnet)

    // Combine contracts and connections
    return {
        contracts: glvWireConfig.contracts,
        connections: glvWireConfig.connections,
    }
}
