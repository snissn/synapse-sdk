/* globals describe it */

import type { BossAcceptanceInput, BossFundingPlan, BossDeploymentManifest } from '@filoz/synapse-core/boss'
import { calibration } from '@filoz/synapse-core/chains'
import { assert } from 'chai'
import { createWalletClient, custom, type Hash, type TransactionReceipt } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { BossServicesPartialCompletionError, ServicesManager } from '../services/index.ts'

const account = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8411c9e87c84c08e2b')
const address = (digit: string) => `0x${digit.repeat(40)}` as const
const hash = (digit: string) => `0x${digit.repeat(64)}` as Hash

const deployment = {
  schemaVersion: 1,
  network: 'test',
  chainId: calibration.id,
  protocolCommit: '4a7bd35801ea6bc0521f942f48a9b7a713172bc0',
  accountCreationCodeHash: hash('1'),
  dependencies: {
    filecoinPay: address('1'),
    pdpVerifier: address('2'),
    fwssService: address('3'),
    fwssStateView: address('4'),
    token: address('5'),
  },
  contracts: {
    BossFactory: { address: address('6'), runtimeCodeHash: hash('2'), deploymentTxHash: hash('3'), deploymentBlock: 1 },
    BossServiceRegistry: {
      address: address('7'),
      runtimeCodeHash: hash('4'),
      deploymentTxHash: hash('5'),
      deploymentBlock: 1,
    },
    BossAdapterRegistry: {
      address: address('8'),
      runtimeCodeHash: hash('6'),
      deploymentTxHash: hash('7'),
      deploymentBlock: 1,
    },
    BossBundles: { address: address('9'), runtimeCodeHash: hash('8'), deploymentTxHash: hash('9'), deploymentBlock: 1 },
    BossStateView: {
      address: address('a'),
      runtimeCodeHash: hash('a'),
      deploymentTxHash: hash('b'),
      deploymentBlock: 1,
    },
  },
} as BossDeploymentManifest

const client = createWalletClient({
  account,
  chain: calibration,
  transport: custom({
    async request() {
      throw new Error('unexpected RPC')
    },
  }),
})

const acceptance = {
  offer: { commissionBps: 0n },
} as BossAcceptanceInput

const plan: BossFundingPlan = {
  requiredApproval: { rateAllowance: 11n, lockupAllowance: 12n, maxLockupPeriod: 13n },
  steps: [
    { kind: 'deposit', amount: 10n },
    { kind: 'approve-operator', rateAllowance: 11n, lockupAllowance: 12n, maxLockupPeriod: 13n },
    { kind: 'deploy-account' },
    { kind: 'accept-offer' },
  ],
}

describe('ServicesManager', () => {
  it('executes only the explicit funding plan, in order', async () => {
    const calls: string[] = []
    const manager = new ServicesManager({
      client,
      deployments: [deployment],
      payments: {
        async deposit({ amount }) {
          calls.push(`deposit:${amount}`)
          return hash('c')
        },
        async approveService({ service, rateAllowance, lockupAllowance, maxLockupPeriod }) {
          calls.push(`approve:${service}:${rateAllowance}:${lockupAllowance}:${maxLockupPeriod}`)
          return hash('d')
        },
      },
      async waitForReceipt(transactionHash) {
        return { transactionHash } as TransactionReceipt
      },
      async execute(request) {
        calls.push(request.functionName)
        return { hash: request.functionName === 'createAccount' ? hash('e') : hash('f'), receipt: null }
      },
    })

    const result = await manager.attach({ owner: account.address, account: address('b'), acceptance, plan })

    assert.deepEqual(calls, [
      'deposit:10',
      `approve:${address('b')}:11:12:13`,
      'createAccount',
      'acceptOffer',
    ])
    assert.deepEqual(
      result.completed.map((stage) => stage.stage),
      ['deposit', 'approve-operator', 'deploy-account', 'accept-offer']
    )
  })

  it('returns typed completed-stage evidence when a later stage fails', async () => {
    const manager = new ServicesManager({
      client,
      deployments: [deployment],
      payments: {
        async deposit() {
          return hash('c')
        },
        async approveService() {
          return hash('d')
        },
      },
      async waitForReceipt(transactionHash) {
        return { transactionHash } as TransactionReceipt
      },
      async execute(request) {
        if (request.functionName === 'acceptOffer') throw new Error('accept failed')
        return { hash: hash('e'), receipt: null }
      },
    })

    try {
      await manager.attach({ owner: account.address, account: address('b'), acceptance, plan })
      assert.fail('expected partial completion')
    } catch (error) {
      assert.isTrue(BossServicesPartialCompletionError.is(error))
      if (!BossServicesPartialCompletionError.is(error)) return
      assert.equal(error.failedStage, 'accept-offer')
      assert.deepEqual(
        error.completed.map((stage) => stage.stage),
        ['deposit', 'approve-operator', 'deploy-account']
      )
    }
  })

  it('uses BossAccount lifecycle calls and never mutates the base FWSS rail', async () => {
    const functions: string[] = []
    const manager = new ServicesManager({
      client,
      deployments: [deployment],
      payments: {
        async deposit() {
          throw new Error('not used')
        },
        async approveService() {
          throw new Error('not used')
        },
      },
      async execute(request) {
        functions.push(request.functionName)
        return { hash: hash('f'), receipt: null }
      },
    })

    const subscriptionId = hash('a')
    await manager.sync({ account: address('b'), subscriptionId })
    await manager.pause({ account: address('b'), subscriptionId })
    await manager.resume({ account: address('b'), subscriptionId })
    await manager.stop({ account: address('b'), subscriptionId })

    assert.deepEqual(functions, ['syncRate', 'pause', 'resume', 'terminate'])
  })

  it('fails closed when the active chain has no explicit Boss manifest', () => {
    const manager = new ServicesManager({
      client,
      deployments: [],
      payments: {
        async deposit() {
          throw new Error('not used')
        },
        async approveService() {
          throw new Error('not used')
        },
      },
    })

    assert.throws(() => manager.deployment(), /No Filecoin Boss deployment is configured/)
  })
})
