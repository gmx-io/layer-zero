import { generateWireConfig } from './devtools'

export default async function () {
    const DVNs = [[], [['P2P', 'Horizen', 'Canary'], 2]] // [[requiredDVNs], [[optionalDVNs], <minRequired>]]

    // Generate wire configs for both token types
    const glvWireConfig = await generateWireConfig('GlvToken', DVNs)
    const gmWireConfig = await generateWireConfig('MarketToken', DVNs)

    // Combine contracts and connections
    return {
        contracts: [...glvWireConfig.contracts, ...gmWireConfig.contracts],
        connections: [...glvWireConfig.connections, ...gmWireConfig.connections],
    }
}
