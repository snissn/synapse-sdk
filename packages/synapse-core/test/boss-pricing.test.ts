/* globals describe it */

import assert from 'assert'
import {
  authorizeMeteredCharge,
  capacityQuoteValidThrough,
  isBossQuoteFresh,
  quoteCapacityRate,
  quoteFlatRate,
  quoteMeteredGross,
} from '../src/boss/index.ts'

const USDFC = 10n ** 18n
const EPOCHS_PER_30_DAYS = 86_400n

describe('Boss pricing', () => {
  it('matches the flat and one-TiB Solidity floor vectors', () => {
    assert.deepEqual(quoteFlatRate({ grossPricePerPeriod: USDFC, periodEpochs: EPOCHS_PER_30_DAYS }), {
      ratePerEpoch: 11_574_074_074_074n,
      remainder: 6_400n,
    })
    assert.equal(
      quoteCapacityRate({
        sizeInBytes: 1n << 40n,
        grossPricePerTiBPerPeriod: USDFC,
        periodEpochs: EPOCHS_PER_30_DAYS,
        billable: true,
      }),
      11_574_074_074_074n
    )
    assert.equal(
      quoteCapacityRate({
        sizeInBytes: 1n << 40n,
        grossPricePerTiBPerPeriod: USDFC,
        periodEpochs: EPOCHS_PER_30_DAYS,
        billable: false,
      }),
      0n
    )
  })

  it('matches metered byte pricing and applies every accepted cap', () => {
    const rawGross = quoteMeteredGross({ units: 1n << 40n, grossPricePerTiB: 7n * USDFC })
    assert.equal(rawGross, 7n * USDFC)

    assert.deepEqual(
      authorizeMeteredCharge({
        rawGross,
        maxSingleCharge: 6n * USDFC,
        windowGross: 4n * USDFC,
        maxChargePerWindow: 8n * USDFC,
        lifetimeGross: 3n * USDFC,
        lifetimeCapGross: 10n * USDFC,
        fixedLockup: 5n * USDFC,
      }),
      {
        chargedGross: 4n * USDFC,
        remainingWindowGross: 0n,
        remainingLifetimeGross: 3n * USDFC,
      }
    )
  })

  it('derives account-owned capacity freshness boundaries', () => {
    assert.equal(
      capacityQuoteValidThrough({ quoteEpoch: 100n, quoteTtlEpochs: 10n, notAfterEpoch: 0n, billable: true }),
      110n
    )
    assert.equal(
      capacityQuoteValidThrough({ quoteEpoch: 100n, quoteTtlEpochs: 10n, notAfterEpoch: 105n, billable: true }),
      105n
    )
    assert.equal(
      capacityQuoteValidThrough({ quoteEpoch: 100n, quoteTtlEpochs: 10n, notAfterEpoch: 0n, billable: false }),
      100n
    )
    assert.equal(isBossQuoteFresh(109n, 110n), true)
    assert.equal(isBossQuoteFresh(110n, 110n), false)
  })

  it('rejects invalid periods and prices before arithmetic', () => {
    assert.throws(() => quoteFlatRate({ grossPricePerPeriod: USDFC, periodEpochs: 0n }))
    assert.throws(() =>
      quoteCapacityRate({
        sizeInBytes: 1n,
        grossPricePerTiBPerPeriod: 0n,
        periodEpochs: EPOCHS_PER_30_DAYS,
        billable: true,
      })
    )
    assert.throws(() => quoteMeteredGross({ units: 1n, grossPricePerTiB: 0n }))
  })
})
