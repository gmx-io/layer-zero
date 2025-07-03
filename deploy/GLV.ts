import assert from 'assert'

import { type DeployFunction, DeployResult } from 'hardhat-deploy/types'

import { EndpointId } from '@layerzerolabs/lz-definitions'

const contractName = 'GLV'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    const endpointV2Deployment = await hre.deployments.get('EndpointV2')

    const eid = hre.network.config.eid
    const networkName = hre.network.name

    let oftDeployment: DeployResult

    if (eid === EndpointId.SEPOLIA_V2_TESTNET || eid === EndpointId.ETHEREUM_V2_MAINNET) {
        console.log(`Deploying ${contractName} lockbox adapter on ${networkName}`)
        const glvTokenAddress = hre.network.config.oftAdapter?.glvTokenAddress

        if (!glvTokenAddress) {
            console.warn(`oftAdapter not configured on network config, skipping GLV Adapter deployment`)
            return
        }

        oftDeployment = await deploy(contractName, {
            from: deployer,
            args: [
                glvTokenAddress, // token address
                endpointV2Deployment.address, // LayerZero's EndpointV2 address
                deployer, // owner
            ],
            log: true,
            skipIfAlreadyDeployed: true,
        })
    } else {
        console.log(`Deploying ${contractName} OFT`)

        oftDeployment = await deploy(contractName, {
            from: deployer,
            args: [
                endpointV2Deployment.address, // LayerZero's EndpointV2 address
                deployer, // owner
            ],
            log: true,
            skipIfAlreadyDeployed: true,
        })
    }

    console.log(`Deployed contract: ${contractName}, network: ${networkName}, address: ${oftDeployment.address}`)
}

deploy.tags = [contractName]

export default deploy
