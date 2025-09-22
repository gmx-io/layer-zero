// Get the environment configuration from .env file
//
// To make use of automatic environment setup:
// - Duplicate .env.example file and name it .env
// - Fill in the environment variables
import 'dotenv/config'

import 'hardhat-deploy'
import 'hardhat-contract-sizer'
import '@nomiclabs/hardhat-ethers'
import '@nomicfoundation/hardhat-verify'
import '@layerzerolabs/toolbox-hardhat'
import { HardhatUserConfig, HttpNetworkAccountsUserConfig } from 'hardhat/types'

import { EndpointId } from '@layerzerolabs/lz-definitions'

import './tasks'

// Specific deployer keys for GM and GLV
const PRIVATE_KEY_GM_DEPLOYER = process.env.PRIVATE_KEY_GM_DEPLOYER
const PRIVATE_KEY_GLV_DEPLOYER = process.env.PRIVATE_KEY_GLV_DEPLOYER

const accounts: HttpNetworkAccountsUserConfig | undefined =
    PRIVATE_KEY_GM_DEPLOYER && PRIVATE_KEY_GLV_DEPLOYER
        ? [PRIVATE_KEY_GM_DEPLOYER, PRIVATE_KEY_GLV_DEPLOYER]
        : undefined

const hardhatAccounts = accounts?.map((key) => ({ privateKey: key, balance: '10000000000000000000000' }))

if (accounts == null) {
    console.warn(
        'Could not find MNEMONIC or PRIVATE_KEY environment variables. It will not be possible to execute transactions in your example.'
    )
}

const config: HardhatUserConfig = {
    paths: {
        cache: 'cache/hardhat',
    },
    solidity: {
        compilers: [
            {
                version: '0.8.22',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
    networks: {
        'arbitrum-mainnet': {
            eid: EndpointId.ARBITRUM_V2_MAINNET,
            url: process.env.RPC_URL_ARBITRUM_MAINNET || 'https://arbitrum.gateway.tenderly.co',
            accounts,
        },
        'base-mainnet': {
            eid: EndpointId.BASE_V2_MAINNET,
            url: process.env.RPC_URL_BASE_MAINNET || 'https://base.gateway.tenderly.co',
            accounts,
        },
        'bera-mainnet': {
            eid: EndpointId.BERA_V2_MAINNET,
            url: process.env.RPC_URL_BERA_MAINNET || 'https://rpc.berachain.com',
            accounts,
        },
        'botanix-mainnet': {
            eid: EndpointId.BOTANIX_V2_MAINNET,
            url: process.env.RPC_URL_BOTANIX_MAINNET || 'https://rpc.botanixlabs.com',
            accounts,
        },
        'bsc-mainnet': {
            eid: EndpointId.BSC_V2_MAINNET,
            url: process.env.RPC_URL_BSC_MAINNET || 'https://bsc.drpc.org',
            accounts,
        },
        'ethereum-mainnet': {
            eid: EndpointId.ETHEREUM_V2_MAINNET,
            url: process.env.RPC_URL_ETHEREUM_MAINNET || 'https://mainnet.gateway.tenderly.co',
            accounts,
        },
        'sepolia-testnet': {
            eid: EndpointId.SEPOLIA_V2_TESTNET,
            url: process.env.RPC_URL_ETHEREUM_TESTNET || 'https://rpc.sepolia.org/',
            accounts,
        },
        'arbitrum-testnet': {
            eid: EndpointId.ARBSEP_V2_TESTNET,
            url: process.env.RPC_URL_ARBITRUM_TESTNET || 'https://sepolia-rollup.arbitrum.io/rpc',
            accounts,
        },
        hardhat: {
            // Need this for testing because TestHelperOz5.sol is exceeding the compiled contract size limit
            allowUnlimitedContractSize: true,
            accounts: hardhatAccounts,
        },
    },
    namedAccounts: {
        deployerGM: {
            default: 0, // GM deployer (first in accounts array)
        },
        deployerGLV: {
            default: 1, // GLV deployer (second in accounts array)
        },
    },
    etherscan: {
        apiKey: {
            'botanix-mainnet': 'not-required',
        },
        customChains: [
            {
                network: 'botanix-mainnet',
                chainId: 3637,
                urls: {
                    apiURL: 'https://api.routescan.io/v2/network/mainnet/evm/3637/etherscan',
                    browserURL: 'https://botanixscan.io',
                },
            },
        ],
    },
}

export default config
