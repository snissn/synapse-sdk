/* globals describe it */

import assert from 'assert'
import {
  ACCEPTANCE_TYPEHASH,
  CAP_POLICY_TYPEHASH,
  SERVICE_OFFER_TYPEHASH,
  USAGE_CLAIM_TYPEHASH,
  deriveSubscriptionId,
  getBossDomainSeparator,
  hashAcceptance,
  hashCapPolicy,
  hashResource,
  hashServiceOffer,
  hashTypedData,
  hashUsageClaim,
} from '../src/boss/index.ts'
import { bossVector } from './fixtures/boss-v1.ts'

describe('Boss hashes', () => {
  it('matches the canonical Solidity type hashes', () => {
    assert.equal(SERVICE_OFFER_TYPEHASH, bossVector.typeHashes.serviceOffer)
    assert.equal(CAP_POLICY_TYPEHASH, bossVector.typeHashes.capPolicy)
    assert.equal(ACCEPTANCE_TYPEHASH, bossVector.typeHashes.acceptance)
    assert.equal(USAGE_CLAIM_TYPEHASH, bossVector.typeHashes.usageClaim)
  })

  it('matches the resource, offer, cap, and acceptance vectors', () => {
    const resourceKey = hashResource(bossVector.resource)
    const offerHash = hashServiceOffer(bossVector.offer)
    const capsHash = hashCapPolicy(bossVector.caps)

    assert.equal(resourceKey, bossVector.expected.resourceKey)
    assert.equal(offerHash, bossVector.expected.serviceOfferHash)
    assert.equal(capsHash, bossVector.expected.capPolicyHash)
    assert.equal(
      hashAcceptance({
        offerHash,
        resourceKey,
        resourceDataHash: bossVector.acceptance.resourceDataHash,
        pricingDataHash: bossVector.acceptance.pricingDataHash,
        capsHash,
        initialFixedBudget: bossVector.acceptance.initialFixedBudget,
        accessGrantHash: bossVector.acceptance.accessGrantHash,
      }),
      bossVector.expected.acceptanceHash
    )
  })

  it('matches the subscription and EIP-712 offer vectors', () => {
    const offerHash = hashServiceOffer(bossVector.offer)
    const resourceKey = hashResource(bossVector.resource)
    const domainSeparator = getBossDomainSeparator({
      chainId: bossVector.domain.chainId,
      verifyingContract: bossVector.domain.verifyingContract,
    })

    assert.equal(
      deriveSubscriptionId({ account: bossVector.subscription.account, offerHash, resourceKey }),
      bossVector.expected.subscriptionId
    )
    assert.equal(domainSeparator, bossVector.expected.domainSeparator)
    assert.equal(hashTypedData(domainSeparator, offerHash), bossVector.expected.offerDigest)
  })

  it('matches the usage-claim struct and digest vectors', () => {
    const claimHash = hashUsageClaim(bossVector.expected.subscriptionId, bossVector.usageClaim)
    const domainSeparator = getBossDomainSeparator({
      chainId: bossVector.domain.chainId,
      verifyingContract: bossVector.domain.verifyingContract,
    })

    assert.equal(claimHash, bossVector.expected.usageClaimHash)
    assert.equal(hashTypedData(domainSeparator, claimHash), bossVector.expected.usageClaimDigest)
  })
})
