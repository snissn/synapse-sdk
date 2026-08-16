/* globals describe it */

import assert from 'assert'
import {
  BillingKind,
  capPolicySchema,
  isNoExpiry,
  isUnlimitedCap,
  MAX_UINT256,
  ResourceKind,
  remainingCap,
  resourceRefSchema,
  SubscriptionState,
  serviceOfferSchema,
  usageClaimSchema,
} from '../src/boss/index.ts'
import { bossVector } from './fixtures/boss-v1.ts'

describe('Boss types', () => {
  it('parses canonical bigint wire values without coercion', () => {
    assert.deepEqual(resourceRefSchema.parse(bossVector.resource), bossVector.resource)
    assert.deepEqual(serviceOfferSchema.parse(bossVector.offer), bossVector.offer)
    assert.deepEqual(capPolicySchema.parse(bossVector.caps), bossVector.caps)
    assert.deepEqual(usageClaimSchema.parse(bossVector.usageClaim), bossVector.usageClaim)
  })

  it('rejects stringified amounts and invalid enum values', () => {
    assert.throws(() => capPolicySchema.parse({ ...bossVector.caps, maxRatePerEpoch: '1' }))
    assert.throws(() => serviceOfferSchema.parse({ ...bossVector.offer, billingKind: 99 }))
  })

  it('preserves the Solidity enum wire values', () => {
    assert.equal(ResourceKind.FWSS_PDP_DATASET, 0)
    assert.equal(BillingKind.STREAM_CAPACITY, 1)
    assert.equal(SubscriptionState.EXHAUSTED, 6)
  })

  it('implements zero, unlimited, and no-expiry cap semantics', () => {
    assert.equal(remainingCap(0n, 0n), 0n)
    assert.equal(remainingCap(10n, 3n), 7n)
    assert.equal(remainingCap(10n, 11n), 0n)
    assert.equal(remainingCap(MAX_UINT256, 1n), MAX_UINT256)
    assert.equal(isUnlimitedCap(MAX_UINT256), true)
    assert.equal(isUnlimitedCap(0n), false)
    assert.equal(isNoExpiry(0n), true)
    assert.equal(isNoExpiry(1n), false)
  })
})
