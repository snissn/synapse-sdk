/* globals describe it */

import assert from 'assert'
import type { Address, Hex } from 'viem'
import {
  acceptBossOfferCall,
  createBossAccountCall,
  pauseBossSubscriptionCall,
  resumeBossSubscriptionCall,
  settleBossSubscriptionCall,
  submitBossUsageClaimCall,
  syncBossRateCall,
  terminateBossSubscriptionCall,
  topUpBossFixedBudgetCall,
} from '../src/boss/index.ts'
import { bossVector } from './fixtures/boss-v1.ts'

const address = (digit: string): Address => `0x${digit.repeat(40)}` as Address
const hash = (digit: string): Hex => `0x${digit.repeat(64)}` as Hex
const account = address('1')
const subscriptionId = hash('2')

describe('Boss transaction builders', () => {
  it('builds deterministic factory deployment calldata without broadcasting', () => {
    const call = createBossAccountCall({
      factory: address('3'),
      owner: address('4'),
      filecoinPay: address('5'),
      serviceRegistry: address('6'),
      adapterRegistry: address('7'),
    })

    assert.equal(call.functionName, 'createAccount')
    assert.equal(call.address, address('3'))
    assert.equal(call.args[0], address('4'))
    assert.equal(call.args[4], 1n)
    assert.ok(call.args[5].startsWith('0x'))
  })

  it('builds an exact offer-acceptance call', () => {
    const call = acceptBossOfferCall({
      account,
      input: {
        offer: bossVector.offer,
        providerSignature: '0x1234',
        resource: bossVector.resource,
        resourceData: '0x',
        pricingData: '0x',
        caps: bossVector.caps,
        initialFixedBudget: 0n,
        accessGrantHash: hash('0'),
      },
    })

    assert.equal(call.functionName, 'acceptOffer')
    assert.equal(call.address, account)
    assert.equal(call.args[0].offer.serviceId, bossVector.offer.serviceId)
  })

  it('builds lifecycle calls as explicit requests only', () => {
    assert.deepEqual(syncBossRateCall({ account, subscriptionId }).args, [subscriptionId])
    assert.deepEqual(pauseBossSubscriptionCall({ account, subscriptionId }).args, [subscriptionId])
    assert.deepEqual(resumeBossSubscriptionCall({ account, subscriptionId }).args, [subscriptionId])
    assert.deepEqual(terminateBossSubscriptionCall({ account, subscriptionId }).args, [subscriptionId])
    assert.deepEqual(settleBossSubscriptionCall({ account, subscriptionId, untilEpoch: 123n }).args, [
      subscriptionId,
      123n,
    ])
    assert.deepEqual(topUpBossFixedBudgetCall({ account, subscriptionId, newFixedBudget: 50n }).args, [
      subscriptionId,
      50n,
    ])
  })

  it('builds reporter claim calldata without calculating a trusted charge', () => {
    const call = submitBossUsageClaimCall({
      account,
      subscriptionId,
      claim: bossVector.usageClaim,
      reporterSignature: '0xabcd',
    })

    assert.equal(call.functionName, 'submitUsageClaim')
    assert.deepEqual(call.args, [subscriptionId, bossVector.usageClaim, '0xabcd'])
  })
})
