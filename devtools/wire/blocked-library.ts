import { METADATA_URL } from '@layerzerolabs/metadata-tools'

import type { EndpointId } from '@layerzerolabs/lz-definitions'

interface RawMetadataDeployment {
    eid: string
    chainKey: string
    version: number
    blockedMessageLib?: { address: string }
}

interface RawMetadata {
    [chainKey: string]: { deployments?: RawMetadataDeployment[] }
}

let cachedMetadata: Promise<RawMetadata> | undefined

async function fetchRawMetadata(): Promise<RawMetadata> {
    if (!cachedMetadata) {
        cachedMetadata = fetch(METADATA_URL).then((res) => {
            if (!res.ok) {
                throw new Error(
                    `Failed to fetch LayerZero metadata from ${METADATA_URL}: ${res.status} ${res.statusText}`
                )
            }
            return res.json() as Promise<RawMetadata>
        })
    }
    return cachedMetadata
}

function findV2Deployment(eid: EndpointId, metadata: RawMetadata): RawMetadataDeployment {
    const eidStr = eid.toString()
    for (const chainKey in metadata) {
        for (const deployment of metadata[chainKey].deployments ?? []) {
            if (deployment.eid === eidStr && deployment.version === 2) {
                return deployment
            }
        }
    }
    throw new Error(`Could not find a v2 LayerZero deployment for eid ${eid} in metadata from ${METADATA_URL}`)
}

/**
 * Every LayerZero V2 endpoint self-deploys and registers an immutable BlockedMessageLib
 * (a SendAndReceive library whose fallback always reverts). Pointing an OApp's send or
 * receive library at this address permanently blocks that direction of a pathway.
 */
export async function getBlockedLibraryAddress(eid: EndpointId): Promise<string> {
    const deployment = findV2Deployment(eid, await fetchRawMetadata())
    const address = deployment.blockedMessageLib?.address
    if (!address) {
        throw new Error(
            `No blockedMessageLib found in LayerZero metadata for eid ${eid} (chainKey: ${deployment.chainKey})`
        )
    }
    return address
}
