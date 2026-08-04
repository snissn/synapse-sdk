/* globals describe it */

import assert from 'assert'
import { calculateTargetRunwayDeposit } from '../src/pay/calculate-target-runway-deposit.ts'

describe('calculateTargetRunwayDeposit', () => {
  it('returns the exact shortfall for a healthy underfunded account', () => {
    const result = calculateTargetRunwayDeposit({
      availableFunds: 400n,
      debt: 0n,
      lockupRatePerEpoch: 10n,
      targetRunwayInEpochs: 50n,
    })

    assert.equal(result, 100n)
  })

  it('returns zero when the requested runway is already covered', () => {
    const result = calculateTargetRunwayDeposit({
      availableFunds: 600n,
      debt: 0n,
      lockupRatePerEpoch: 10n,
      targetRunwayInEpochs: 50n,
    })

    assert.equal(result, 0n)
  })

  it('includes current debt for an account in deficit', () => {
    const result = calculateTargetRunwayDeposit({
      availableFunds: 0n,
      debt: 75n,
      lockupRatePerEpoch: 10n,
      targetRunwayInEpochs: 50n,
    })

    assert.equal(result, 575n)
  })

  it('does not create a runway requirement when the per-epoch rate is zero', () => {
    const result = calculateTargetRunwayDeposit({
      availableFunds: 0n,
      debt: 0n,
      lockupRatePerEpoch: 0n,
      targetRunwayInEpochs: 1_000_000n,
    })

    assert.equal(result, 0n)
  })

  it('still clears current debt when the per-epoch rate is zero', () => {
    const result = calculateTargetRunwayDeposit({
      availableFunds: 0n,
      debt: 75n,
      lockupRatePerEpoch: 0n,
      targetRunwayInEpochs: 1_000_000n,
    })

    assert.equal(result, 75n)
  })

  it('returns zero at the exact funding boundary', () => {
    const result = calculateTargetRunwayDeposit({
      availableFunds: 500n,
      debt: 0n,
      lockupRatePerEpoch: 10n,
      targetRunwayInEpochs: 50n,
    })

    assert.equal(result, 0n)
  })
})
