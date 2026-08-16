/* globals describe it */

import assert from 'assert'
import type { Address, Hex } from 'viem'
import { createPublicClient, custom, encodeFunctionResult } from 'viem'
import {
  bossAccountSnapshotCall,
  bossClaimSnapshotCall,
  bossQuoteSnapshotCall,
  bossStateViewAbi,
  bossSubscriptionPageCall,
  bossSubscriptionSnapshotCall,
  ResourceKind,
  readBossAccountSnapshot,
} from '../src/boss/index.ts'
import { calibration } from '../src/chains.ts'

const address = (digit: string): Address => `0x${digit.repeat(40)}` as Address
const hash = (digit: string): Hex => `0x${digit.repeat(64)}` as Hex

const stateView = address('1')
const account = address('2')
const subscriptionId = hash('3')
const resource = {
  kind: ResourceKind.FWSS_PDP_DATASET,
  chainId: 314_159n,
  anchor: address('4'),
  resourceId: 42n,
  context: hash('0'),
} as const
const claim = {
  claimId: hash('5'),
  fromEpoch: 100n,
  toEpoch: 110n,
  units: 1n << 40n,
  evidenceHash: hash('6'),
  evidenceURI: 'ipfs://claim',
  nonce: 7n,
} as const

describe('Boss read calls', () => {
  it('builds signer-free bounded state-view reads', () => {
    assert.deepEqual(bossAccountSnapshotCall({ stateView, account }), {
      abi: bossAccountSnapshotCall({ stateView, account }).abi,
      address: stateView,
      functionName: 'account',
      args: [account],
    })
    assert.deepEqual(bossSubscriptionSnapshotCall({ stateView, account, subscriptionId }).args, [
      account,
      subscriptionId,
    ])
    assert.deepEqual(bossSubscriptionPageCall({ stateView, account, offset: 4n, limit: 32n }).args, [account, 4n, 32n])
  })

  it('reads one account snapshot with one public-client call and no signer', async () => {
    const expected = {
      owner: address('3'),
      payer: address('3'),
      filecoinPay: address('4'),
      serviceRegistry: address('5'),
      adapterRegistry: address('6'),
      factory: address('7'),
      accountVersion: 1n,
    }
    let ethCalls = 0
    const client = createPublicClient({
      chain: calibration,
      transport: custom({
        async request({ method }) {
          assert.equal(method, 'eth_call')
          ethCalls += 1
          return encodeFunctionResult({ abi: bossStateViewAbi, functionName: 'account', result: expected })
        },
      }),
    })

    assert.deepEqual(await readBossAccountSnapshot(client, { stateView, account }), expected)
    assert.equal(ethCalls, 1)
  })

  it('builds exact quote and claim preflight reads', () => {
    const quote = bossQuoteSnapshotCall({
      stateView,
      account,
      subscriptionId,
      resource,
      resourceData: '0x',
      pricingData: '0x1234',
    })
    assert.equal(quote.functionName, 'quote')
    assert.deepEqual(quote.args, [account, subscriptionId, resource, '0x', '0x1234'])

    const usage = bossClaimSnapshotCall({ stateView, account, subscriptionId, claim })
    assert.equal(usage.functionName, 'claim')
    assert.deepEqual(usage.args, [account, subscriptionId, claim])
  })

  it('rejects unbounded or empty subscription pages before RPC', () => {
    assert.throws(() => bossSubscriptionPageCall({ stateView, account, offset: 0n, limit: 0n }))
    assert.throws(() => bossSubscriptionPageCall({ stateView, account, offset: 0n, limit: 33n }))
  })
})
