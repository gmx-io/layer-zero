import assert from 'assert'

import { type DeployFunction, DeployResult } from 'hardhat-deploy/types'

import { EndpointId } from '@layerzerolabs/lz-definitions'

const contractName = 'MarketToken'

const adapterContractName = 'MarketToken_Adapter'
const oftContractName = 'MarketToken_OFT'

const tokenName = 'GMX Market'
const tokenSymbol = 'GM'

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

    let deployingContractName = oftContractName
    let oftDeployment: DeployResult

    if (eid === EndpointId.ARBSEP_V2_TESTNET || eid === EndpointId.ARBITRUM_V2_MAINNET) {
        deployingContractName = adapterContractName

        const gmTokenAddress = hre.network.config.oftAdapter?.gmTokenAddress
        if (!gmTokenAddress) {
            console.warn(`oftAdapter not configured on network config, skipping GM Adapter deployment`)
            return
        }

        console.log(
            `Deploying ${adapterContractName} lockbox adapter on ${networkName} with innerToken address: ${gmTokenAddress}`
        )
        oftDeployment = await deploy(adapterContractName, {
            from: deployer,
            args: [
                gmTokenAddress, // token address
                endpointV2Deployment.address,
                deployer, // owner
            ],
            log: true,
            skipIfAlreadyDeployed: true,
        })
    } else {
        console.log(`Deploying ${oftContractName} OFT with token name: ${tokenName} and symbol: ${tokenSymbol}`)

        oftDeployment = await deploy(oftContractName, {
            from: deployer,
            args: [
                tokenName,
                tokenSymbol,
                endpointV2Deployment.address,
                deployer, // owner
            ],
            log: true,
            skipIfAlreadyDeployed: true,
        })
    }

    console.log(
        `Deployed contract: ${deployingContractName}, network: ${networkName}, address: ${oftDeployment.address}`
    )
}

deploy.tags = [contractName]

export default deploy
