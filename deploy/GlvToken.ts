import assert from 'assert'

import { type DeployFunction, DeployResult } from 'hardhat-deploy/types'

import { EndpointId } from '@layerzerolabs/lz-definitions'

import { getContractAddress, getDeployConfig, isHubNetwork, logNetworkInfo, shouldDeployToNetwork } from '../devtools'

const contractName = 'GlvToken' // This is the main contract name for the GLV token

const adapterContractName = 'GlvToken_Adapter'
const oftContractName = 'GlvToken_OFT'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployerGLV } = await getNamedAccounts()
    const deployer = deployerGLV

    assert(deployer, 'Missing named deployer account')

    // Get market pair configuration (cached after first call)
    const { marketPairKey, marketPairConfig } = await getDeployConfig()
    const glvConfig = marketPairConfig.GLV

    const eid = hre.network.config.eid as EndpointId
    const networkName = hre.network.name

    // Skip deployment if this network is not configured for this market pair
    if (!shouldDeployToNetwork(marketPairConfig, eid)) {
        console.log(`⏭️  Skipping GLV deployment on ${networkName} - not configured for ${marketPairKey}`)
        return
    }

    // Log network info for this deployment
    await logNetworkInfo(hre, networkName, deployer, eid)

    const endpointV2Deployment = await hre.deployments.get('EndpointV2')

    let deployingContractName = oftContractName
    let oftDeployment: DeployResult

    // Check if we're on the hub network - if so, deploy adapter, otherwise deploy OFT
    if (isHubNetwork(marketPairConfig, 'GLV', eid)) {
        deployingContractName = adapterContractName

        try {
            const glvTokenAddress = getContractAddress(marketPairConfig, 'GLV', eid)

            console.log(`Deploying ${adapterContractName} for ${marketPairKey}`)
            oftDeployment = await deploy(`${adapterContractName}_${marketPairKey}`, {
                from: deployer,
                args: [
                    glvTokenAddress, // token address
                    endpointV2Deployment.address, // LayerZero's EndpointV2 address
                    deployer, // owner
                ],
                log: true,
                skipIfAlreadyDeployed: true,
                contract: adapterContractName,
            })
        } catch (error) {
            console.error(`❌ ${error instanceof Error ? error.message : String(error)}`)
            return
        }
    } else {
        console.log(`Deploying ${oftContractName} for ${marketPairKey}`)

        oftDeployment = await deploy(`${oftContractName}_${marketPairKey}`, {
            from: deployer,
            args: [
                glvConfig.tokenName,
                glvConfig.tokenSymbol,
                endpointV2Deployment.address, // LayerZero's EndpointV2 address
                deployer, // owner
            ],
            log: true,
            skipIfAlreadyDeployed: true,
            contract: oftContractName,
        })
    }

    console.log(
        `Deployed contract: ${deployingContractName}, network: ${networkName}, address: ${oftDeployment.address}\n`
    )
}

deploy.tags = [contractName]

export default deploy
