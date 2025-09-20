import { constants } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'
import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'

import { getDeployConfig } from '../devtools/deploy/utils'

interface SendArgs {
    marketPair: string
    tokenType: 'GM' | 'GLV'
    amount: string
    recipient?: string
    full?: boolean
    eids?: string
    toHub?: boolean
}

const sendTokens = task('lz:sdk:vape:send-tokens', 'Send tokens to all peer networks via LayerZero')
    .addParam('marketPair', 'Market pair to send tokens for (e.g., WETH_USDC)')
    .addParam('tokenType', 'Token type to send (GM or GLV)')
    .addOptionalParam(
        'amount',
        'Amount of tokens to send (in token units, e.g., "1.5") - ignored if --full flag is used'
    )
    .addOptionalParam('recipient', 'Recipient address (defaults to sender address)')
    .addOptionalParam('eids', 'Comma-separated list of EIDs to send to (limits peer networks)')
    .addFlag('full', 'Send entire balance divided equally among all peers')
    .addFlag('toHub', 'Send tokens to hub network only')
    .setAction(async (taskArgs: SendArgs, hre: HardhatRuntimeEnvironment) => {
        const { marketPair, tokenType, amount, recipient, full, eids, toHub } = taskArgs

        if (!amount && !full) {
            throw new Error('Amount or full flag is required')
        }

        if (full) {
            console.log(`🚀 Sending FULL balance of ${tokenType} tokens from ${hre.network.name} to all peers`)
        } else {
            console.log(`🚀 Sending ${amount} ${tokenType} tokens from ${hre.network.name} to all peers`)
        }
        console.log(`Market Pair: ${marketPair}`)

        // Set environment variable for getDeployConfig
        const oldMarketPair = process.env.MARKET_PAIR
        process.env.MARKET_PAIR = marketPair

        try {
            // Get deployment config
            const { marketPairConfig } = await getDeployConfig()
            const tokenConfig = tokenType === 'GM' ? marketPairConfig.GM : marketPairConfig.GLV

            // Get current network EID
            const currentNetworkEid = (hre.network.config as { eid?: number }).eid
            if (!currentNetworkEid) {
                throw new Error(`No EID found for network ${hre.network.name}`)
            }

            // Determine if current network is hub or expansion
            const isHub = tokenConfig.hubNetwork.eid === currentNetworkEid
            const contractName = isHub
                ? `${tokenType === 'GM' ? 'MarketToken' : 'GlvToken'}_Adapter_${marketPair}`
                : `${tokenType === 'GM' ? 'MarketToken' : 'GlvToken'}_OFT_${marketPair}`

            console.log(`Current network: ${hre.network.name} (EID: ${currentNetworkEid})`)
            console.log(`Contract type: ${isHub ? 'Adapter' : 'OFT'}`)
            console.log(`Contract name: ${contractName}`)

            // Get the contract using deployments
            let oftContract
            try {
                const deployment = await hre.deployments.get(contractName)
                oftContract = await hre.ethers.getContractAt(deployment.abi, deployment.address)

                console.log(`Contract address: ${deployment.address}`)
            } catch (error) {
                console.error(`❌ Failed to get contract ${contractName}:`, error)
                console.log('\n💡 Available contracts:')
                try {
                    const deployments = await hre.deployments.all()
                    Object.keys(deployments).forEach((name) => {
                        if (name.includes(marketPair)) {
                            console.log(`   ${name}`)
                        }
                    })
                } catch (e) {
                    console.log('   Could not list deployments')
                }
                return
            }

            // Get signer based on token type (like deployment scripts)
            const { deployerGM, deployerGLV } = await hre.getNamedAccounts()
            const deployerAddress = tokenType === 'GM' ? deployerGM : deployerGLV

            if (!deployerAddress) {
                throw new Error(
                    `No ${tokenType === 'GM' ? 'deployerGM' : 'deployerGLV'} account found in named accounts`
                )
            }

            const signer = await hre.ethers.getSigner(deployerAddress)
            const signerAddress = deployerAddress
            const recipientAddress = recipient || signerAddress

            console.log(`Sender: ${signerAddress}`)
            console.log(`Recipient: ${recipientAddress}`)

            // Get all peer networks (hub + expansion networks, excluding current)
            const allNetworkEids = toHub
                ? [tokenConfig.hubNetwork.eid]
                : [tokenConfig.hubNetwork.eid, ...tokenConfig.expansionNetworks]
            let peerEids = allNetworkEids.filter((eid) => eid !== currentNetworkEid)

            // Filter by specific EIDs if provided
            if (eids) {
                const targetEids = eids.split(',').map((eid) => parseInt(eid.trim(), 10))
                peerEids = peerEids.filter((eid) => targetEids.includes(eid))
                console.log(`🎯 Filtering to specific EIDs: ${targetEids.join(', ')}`)
            }

            if (peerEids.length === 0) {
                console.log('❌ No peer networks found to send to')
                return
            }

            console.log(`\n📡 Found ${peerEids.length} peer networks:`)
            peerEids.forEach((eid) => {
                const networkName =
                    Object.entries(hre.config.networks).find(
                        ([_, config]) => (config as { eid?: number }).eid === eid
                    )?.[0] || `EID-${eid}`
                console.log(`   ${networkName} (EID: ${eid})`)
            })

            // Get current balance - for adapters, use underlying token balance
            let balance
            let tokenContract
            try {
                // Check if this is an adapter (has token() method)
                try {
                    const tokenAddress = await oftContract.token()
                    console.log(`Token address: ${tokenAddress}`)

                    // Get token contract for balance check
                    try {
                        const erc20Artifact = await hre.artifacts.readArtifact('ERC20')
                        tokenContract = await hre.ethers.getContractAt(erc20Artifact.abi, tokenAddress)
                        balance = await tokenContract.balanceOf(signerAddress)
                    } catch (e) {
                        // Use low-level call for balance if no ERC20 ABI
                        const balanceCalldata = hre.ethers.utils.defaultAbiCoder.encode(
                            ['bytes4', 'address'],
                            ['0x70a08231', signerAddress]
                        )
                        const result = await hre.ethers.provider.call({
                            to: tokenAddress,
                            data: balanceCalldata,
                        })
                        balance = hre.ethers.BigNumber.from(result)
                    }
                } catch (e) {
                    // Regular OFT - use contract balance directly
                    balance = await oftContract.balanceOf(signerAddress)
                }

                console.log(`Current balance: ${hre.ethers.utils.formatEther(balance)} tokens`)
            } catch (error) {
                console.log(`⚠️  Could not check balance: ${error}`)
                return
            }

            // Calculate amount to send per peer
            let amountLD
            if (full) {
                if (balance.eq(0)) {
                    console.log(`❌ No balance to send`)
                    return
                }
                // Divide total balance by number of peers
                amountLD = balance.div(peerEids.length)
                console.log(`\n💰 Full balance mode: ${hre.ethers.utils.formatEther(balance)} tokens total`)
                console.log(`   Amount per peer: ${hre.ethers.utils.formatEther(amountLD)} tokens`)
                console.log(`   Total peers: ${peerEids.length}`)
            } else {
                // Parse specified amount (assume 18 decimals)
                amountLD = parseUnits(amount, 18)
                console.log(`\n💰 Amount to send per peer: ${amount} tokens (${amountLD.toString()} wei)`)

                const totalAmount = amountLD.mul(peerEids.length)
                if (balance.lt(totalAmount)) {
                    console.log(`⚠️  Warning: Insufficient balance for all sends`)
                    console.log(`   Required: ${hre.ethers.utils.formatEther(totalAmount)} tokens`)
                    console.log(`   Available: ${hre.ethers.utils.formatEther(balance)} tokens`)
                }
            }

            // Check and handle approvals if needed
            try {
                const approvalRequired = await oftContract.approvalRequired()

                if (approvalRequired && tokenContract) {
                    console.log(`\n🔓 Approval required for adapter...`)

                    // Check current allowance
                    const allowance = await tokenContract.allowance(signerAddress, oftContract.address)
                    const totalAmount = full ? balance : amountLD.mul(peerEids.length)

                    if (allowance.lt(totalAmount)) {
                        console.log(`   Setting max approval...`)
                        const approveTx = await tokenContract
                            .connect(signer)
                            .approve(oftContract.address, constants.MaxUint256)
                        console.log(`   Approval tx: ${approveTx.hash}`)
                        await approveTx.wait()
                        console.log(`   ✅ Approval confirmed`)
                    } else {
                        console.log(`   ✅ Sufficient approval already exists`)
                    }
                } else if (approvalRequired && !tokenContract) {
                    console.log(`\n🔓 Approval required, using low-level call...`)
                    const tokenAddress = await oftContract.token()

                    // Use low-level call if no ERC20 ABI available
                    const approveCalldata = hre.ethers.utils.defaultAbiCoder.encode(
                        ['bytes4', 'address', 'uint256'],
                        ['0x095ea7b3', oftContract.address, constants.MaxUint256] // approve(address,uint256)
                    )

                    const approveTx = await signer.sendTransaction({
                        to: tokenAddress,
                        data: approveCalldata,
                    })
                    console.log(`   Approval tx: ${approveTx.hash}`)
                    await approveTx.wait()
                    console.log(`   ✅ Approval confirmed (low-level call)`)
                } else {
                    console.log(`\n✅ No approval required for this contract`)
                }
            } catch (error) {
                console.log(`⚠️  Could not check/set approval: ${error}`)
            }

            console.log(`\n🚀 Starting token sends...`)

            const results: Array<{
                eid: number
                networkName: string
                success: boolean
                txHash?: string
                layerZeroScanUrl?: string
                error?: string
            }> = []

            // Send to each peer network
            for (let i = 0; i < peerEids.length; i++) {
                const dstEid = peerEids[i]
                const isLastPeer = i === peerEids.length - 1
                const networkName =
                    Object.entries(hre.config.networks).find(
                        ([_, config]) => (config as { eid?: number }).eid === dstEid
                    )?.[0] || `EID-${dstEid}`

                console.log(`\n📤 Sending to ${networkName} (EID: ${dstEid})...`)

                try {
                    // For full mode, use remaining balance for the last transaction
                    let actualAmountLD = amountLD
                    if (full && isLastPeer) {
                        // Get current balance and send whatever is left
                        let currentBalance
                        if (tokenContract) {
                            // For adapters, check underlying token balance
                            currentBalance = await tokenContract.balanceOf(signerAddress)
                        } else {
                            // For regular OFTs, check OFT balance
                            currentBalance = await oftContract.balanceOf(signerAddress)
                        }
                        actualAmountLD = currentBalance
                        console.log(
                            `   📋 Last peer - sending remaining balance: ${hre.ethers.utils.formatEther(currentBalance)} tokens`
                        )
                    }

                    // Prepare sendParam
                    const sendParam = {
                        dstEid: dstEid,
                        to: addressToBytes32(recipientAddress),
                        amountLD: actualAmountLD.toString(),
                        minAmountLD: 0, // No slippage for exact amount
                        extraOptions: '0x',
                        composeMsg: '0x',
                        oftCmd: '0x',
                    }

                    // Get quote first
                    console.log(`   Getting quote...`)
                    const quote = await oftContract.quoteSend(sendParam, false)
                    const nativeFee = quote.nativeFee
                    console.log(`   Native fee: ${hre.ethers.utils.formatEther(nativeFee)} ETH`)

                    // Check if sender has enough native tokens for fee
                    const balance = await signer.getBalance()
                    if (balance.lt(nativeFee)) {
                        throw new Error(
                            `Insufficient native balance. Need: ${hre.ethers.utils.formatEther(
                                nativeFee
                            )} ETH, Have: ${hre.ethers.utils.formatEther(balance)} ETH`
                        )
                    }

                    // Send the tokens
                    console.log(`   Sending tokens...`)
                    const sendTx = await oftContract.connect(signer).send(
                        sendParam,
                        quote,
                        signerAddress, // refund address
                        { value: nativeFee }
                    )

                    console.log(`   ✅ Transaction sent: ${sendTx.hash}`)
                    console.log(`   ⏳ Waiting for confirmation...`)

                    const receipt = await sendTx.wait()
                    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`)

                    // Generate LayerZero scan URL
                    const layerZeroScanUrl = `https://layerzeroscan.com/tx/${sendTx.hash}`
                    console.log(`   🔍 LayerZero Scan: ${layerZeroScanUrl}`)

                    results.push({
                        eid: dstEid,
                        networkName,
                        success: true,
                        txHash: sendTx.hash,
                        layerZeroScanUrl,
                    })
                } catch (error) {
                    console.log(`   ❌ Failed: ${error}`)
                    results.push({
                        eid: dstEid,
                        networkName,
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    })
                }
            }

            // Summary
            console.log(`\n📊 Send Summary:`)
            console.log(`=`.repeat(60))

            const successful = results.filter((r) => r.success)
            const failed = results.filter((r) => !r.success)

            console.log(`✅ Successful sends: ${successful.length}/${results.length}`)
            console.log(`❌ Failed sends: ${failed.length}/${results.length}`)

            if (successful.length > 0) {
                console.log(`\n🔗 LayerZero Scan URLs:`)
                successful.forEach((result) => {
                    console.log(`   ${result.networkName}: ${result.layerZeroScanUrl}`)
                })
            }

            if (failed.length > 0) {
                console.log(`\n❌ Failed Sends:`)
                failed.forEach((result) => {
                    console.log(`   ${result.networkName}: ${result.error}`)
                })
            }

            console.log(`\n🎉 Send operation completed!`)
        } finally {
            // Restore environment variable
            if (oldMarketPair === undefined) {
                delete process.env.MARKET_PAIR
            } else {
                process.env.MARKET_PAIR = oldMarketPair
            }
        }
    })

export { sendTokens }
