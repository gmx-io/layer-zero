import { DVNConfigs, generateWireConfig } from './devtools'

export default async function () {
    // Generate wire configs for both token types
    /// Using default testnet dvns
    const glvWireConfig = await generateWireConfig('GlvToken', DVNConfigs.testnet)
    const gmWireConfig = await generateWireConfig('MarketToken', DVNConfigs.testnet)

    // Combine contracts and connections
    return {
        contracts: [...glvWireConfig.contracts, ...gmWireConfig.contracts],
        connections: [...glvWireConfig.connections, ...gmWireConfig.connections],
    }
}
