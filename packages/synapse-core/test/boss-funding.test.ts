/* globals describe it */

import assert from 'assert'
import { planBossFunding } from '../src/boss/index.ts'

const unapproved = {
  isApproved: false,
  rateAllowance: 0n,
  lockupAllowance: 0n,
  rateUsage: 10n,
  lockupUsage: 20n,
  maxLockupPeriod: 0n,
}

describe('Boss funding plans', () => {
  it('orders every explicit first-attachment prerequisite', () => {
    const plan = planBossFunding({
      depositAmount: 100n,
      accountDeployed: false,
      subscriptionExists: false,
      requiredRatePerEpoch: 5n,
      initialFixedBudget: 50n,
      requiredMaxLockupPeriod: 2_880n,
      approval: unapproved,
    })

    assert.deepEqual(plan.requiredApproval, {
      rateAllowance: 15n,
      lockupAllowance: 70n,
      maxLockupPeriod: 2_880n,
    })
    assert.deepEqual(plan.steps, [
      { kind: 'deposit', amount: 100n },
      {
        kind: 'approve-operator',
        rateAllowance: 15n,
        lockupAllowance: 70n,
        maxLockupPeriod: 2_880n,
      },
      { kind: 'deploy-account' },
      { kind: 'accept-offer' },
    ])
  })

  it('does not restore stale oversized allowances after revocation', () => {
    const plan = planBossFunding({
      depositAmount: 0n,
      accountDeployed: false,
      subscriptionExists: false,
      requiredRatePerEpoch: 5n,
      initialFixedBudget: 50n,
      requiredMaxLockupPeriod: 2_880n,
      approval: {
        ...unapproved,
        rateAllowance: 1_000n,
        lockupAllowance: 2_000n,
        maxLockupPeriod: 10_000n,
      },
    })

    assert.deepEqual(plan.requiredApproval, {
      rateAllowance: 15n,
      lockupAllowance: 70n,
      maxLockupPeriod: 2_880n,
    })
  })

  it('returns no hidden action when every requested change is already satisfied', () => {
    const plan = planBossFunding({
      depositAmount: 0n,
      accountDeployed: true,
      subscriptionExists: true,
      requiredRatePerEpoch: 5n,
      initialFixedBudget: 50n,
      requiredMaxLockupPeriod: 2_880n,
      approval: unapproved,
    })

    assert.deepEqual(plan.steps, [])
  })

  it('plans only the approval delta and explicit fixed-budget top-up', () => {
    const plan = planBossFunding({
      depositAmount: 0n,
      accountDeployed: true,
      subscriptionExists: true,
      requiredRatePerEpoch: 0n,
      initialFixedBudget: 0n,
      requiredMaxLockupPeriod: 2_880n,
      currentFixedBudget: 10n,
      requestedFixedBudget: 25n,
      approval: {
        isApproved: true,
        rateAllowance: 5n,
        lockupAllowance: 20n,
        rateUsage: 5n,
        lockupUsage: 20n,
        maxLockupPeriod: 2_880n,
      },
    })

    assert.deepEqual(plan.requiredApproval, {
      rateAllowance: 5n,
      lockupAllowance: 35n,
      maxLockupPeriod: 2_880n,
    })
    assert.deepEqual(plan.steps, [
      {
        kind: 'approve-operator',
        rateAllowance: 5n,
        lockupAllowance: 35n,
        maxLockupPeriod: 2_880n,
      },
      { kind: 'top-up-fixed-budget', newFixedBudget: 25n },
    ])
  })

  it('rejects ambiguous or decreasing plans', () => {
    assert.throws(() =>
      planBossFunding({
        depositAmount: -1n,
        accountDeployed: true,
        subscriptionExists: true,
        requiredRatePerEpoch: 0n,
        initialFixedBudget: 0n,
        requiredMaxLockupPeriod: 0n,
        approval: unapproved,
      })
    )
    assert.throws(() =>
      planBossFunding({
        depositAmount: 0n,
        accountDeployed: true,
        subscriptionExists: true,
        requiredRatePerEpoch: 0n,
        initialFixedBudget: 0n,
        requiredMaxLockupPeriod: 2_880n,
        currentFixedBudget: 20n,
        requestedFixedBudget: 10n,
        approval: unapproved,
      })
    )
  })
})
