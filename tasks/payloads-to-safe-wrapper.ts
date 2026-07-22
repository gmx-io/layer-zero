import fs from 'fs'

import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { groupTransactionsByChain, writeSafeBatchFiles } from '../devtools/payloads'

const glob = require('glob')

interface PayloadsToSafeArgs {
    input: string
    name?: string
    description?: string
    outputDir?: string
    prefix?: string
}

const payloadsToSafe = task(
    'lz:sdk:payloads-to-safe',
    'Convert raw wire/unwire payload JSON files into per-chain Gnosis Safe Transaction Builder JSON'
)
    .addParam(
        'input',
        'Glob or comma-separated list of raw payload JSON files (e.g. "payloads/unwire-payloads-send-block-*.json")'
    )
    .addOptionalParam('name', 'Safe batch meta.name', 'LayerZero OApp configuration')
    .addOptionalParam('description', 'Safe batch meta.description', '')
    .addOptionalParam('outputDir', 'Directory to write <prefix>-chain-*.json files into', 'payloads')
    .addOptionalParam(
        'prefix',
        "Filename prefix for the written batches, so multiple stages/runs don't overwrite each other (files are written as <prefix>-chain-<id>.json)",
        'safe-batch'
    )
    .setAction(async (args: PayloadsToSafeArgs, hre: HardhatRuntimeEnvironment) => {
        const patterns = args.input.split(',').map((p) => p.trim())

        // Validated per-pattern, not just on the combined total: a `--input` with multiple
        // comma-separated globs (e.g. combining receive-block + unpeer into one batch) must
        // not silently drop one phase's transactions just because that glob happened to match
        // nothing (e.g. because that phase's payloads were never generated).
        const filesByPattern = patterns.map((pattern) => ({
            pattern,
            files: glob.hasMagic(pattern) ? (glob.sync(pattern) as string[]) : [pattern],
        }))

        const emptyPatterns = filesByPattern.filter(({ files }) => files.length === 0)
        if (emptyPatterns.length > 0) {
            throw new Error(
                `The following --input pattern(s) matched no files:\n` +
                    emptyPatterns.map(({ pattern }) => `  ${pattern}`).join('\n') +
                    `\nGenerate the missing payloads first (or fix the glob) — refusing to write a Safe batch that's silently missing part of what you asked for.`
            )
        }

        const files = filesByPattern.flatMap(({ files }) => files)

        console.log(`Reading ${files.length} payload file(s):`)
        files.forEach((f: string) => console.log(`  ${f}`))

        const transactions = files.flatMap((f: string) => JSON.parse(fs.readFileSync(f, 'utf8')))

        const batches = groupTransactionsByChain(transactions, hre, {
            name: args.name || 'LayerZero OApp configuration',
            description: args.description || '',
        })

        const written = writeSafeBatchFiles(batches, args.outputDir || 'payloads', args.prefix || 'safe-batch')
        written.forEach((f) => console.log(`Wrote ${f}`))
    })

export { payloadsToSafe }
