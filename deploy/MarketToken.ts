import assert from 'assert'

import { type DeployFunction, DeployResult } from 'hardhat-deploy/types'

import { EndpointId } from '@layerzerolabs/lz-definitions'

import {
    GM_TOKEN_NAME,
    getContractAddress,
    getDeployConfig,
    isHubNetwork,
    logNetworkInfo,
    shouldDeployToNetwork,
} from '../devtools'

const contractName = 'MarketToken'

const adapterContractName = 'MarketToken_Adapter'
const oftContractName = 'MarketToken_OFT'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployerGM } = await getNamedAccounts()
    const deployer = deployerGM

    assert(deployer, 'Missing named deployer account')

    // Get market pair configuration (cached after first call)
    const { marketPairKey, marketPairConfig } = await getDeployConfig()
    const gmConfig = marketPairConfig.GM

    const eid = hre.network.config.eid as EndpointId
    const networkName = hre.network.name

    // Skip deployment if this network is not configured for this market pair
    if (!shouldDeployToNetwork(marketPairConfig, eid)) {
        console.log(`⏭️  Skipping GM deployment on ${networkName} - not configured for ${marketPairKey}`)
        return
    }

    // Log network info for this deployment
    await logNetworkInfo(hre, networkName, deployer, eid)

    const endpointV2Deployment = await hre.deployments.get('EndpointV2')

    let deployingContractName = oftContractName
    let oftDeployment: DeployResult

    // Check if we're on the hub network - if so, deploy adapter, otherwise deploy OFT
    if (isHubNetwork(marketPairConfig, 'GM', eid)) {
        deployingContractName = adapterContractName

        try {
            const gmTokenAddress = getContractAddress(marketPairConfig, 'GM', eid)

            console.log(`Deploying ${adapterContractName} for ${marketPairKey}`)
            oftDeployment = await deploy(`${adapterContractName}_${marketPairKey}`, {
                from: deployer,
                args: [
                    gmTokenAddress, // token address
                    endpointV2Deployment.address,
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
                GM_TOKEN_NAME,
                gmConfig.tokenSymbol,
                endpointV2Deployment.address,
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
