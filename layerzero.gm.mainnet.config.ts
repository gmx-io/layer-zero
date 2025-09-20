import { DVNConfigs, generateWireConfig } from './devtools'

export default async function () {
    // Generate wire configs for both token types
    /// Using default mainnet dvns
    const gmWireConfig = await generateWireConfig('MarketToken', DVNConfigs.mainnet)

    // Combine contracts and connections
    return {
        contracts: gmWireConfig.contracts,
        connections: gmWireConfig.connections,
    }
}
