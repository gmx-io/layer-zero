import { DVNConfigs, generateWireConfig } from './devtools'

export default async function () {
    // Generate wire configs for both token types
    /// Using default mainnet dvns
    const glvWireConfig = await generateWireConfig('GlvToken', DVNConfigs.mainnet)
    const gmWireConfig = await generateWireConfig('MarketToken', DVNConfigs.mainnet)

    // Combine contracts and connections
    return {
        contracts: [...glvWireConfig.contracts, ...gmWireConfig.contracts],
        connections: [...glvWireConfig.connections, ...gmWireConfig.connections],
    }
}
