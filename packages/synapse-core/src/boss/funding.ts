import { ValidationError } from '../errors/base.ts'
import type { operatorApprovals } from '../pay/operator-approvals.ts'

export type BossOperatorApprovalState = operatorApprovals.OutputType

export type BossFundingStep =
  | { kind: 'deposit'; amount: bigint }
  | {
      kind: 'approve-operator'
      rateAllowance: bigint
      lockupAllowance: bigint
      maxLockupPeriod: bigint
    }
  | { kind: 'deploy-account' }
  | { kind: 'accept-offer' }
  | { kind: 'top-up-fixed-budget'; newFixedBudget: bigint }

export type BossFundingPlanInput = {
  depositAmount: bigint
  accountDeployed: boolean
  subscriptionExists: boolean
  requiredRatePerEpoch: bigint
  initialFixedBudget: bigint
  requiredMaxLockupPeriod: bigint
  approval: BossOperatorApprovalState
  currentFixedBudget?: bigint
  requestedFixedBudget?: bigint
}

export type BossFundingPlan = {
  requiredApproval: {
    rateAllowance: bigint
    lockupAllowance: bigint
    maxLockupPeriod: bigint
  }
  steps: BossFundingStep[]
}

export function planBossFunding(input: BossFundingPlanInput): BossFundingPlan {
  requireNonNegative(input.depositAmount, 'depositAmount')
  requireNonNegative(input.requiredRatePerEpoch, 'requiredRatePerEpoch')
  requireNonNegative(input.initialFixedBudget, 'initialFixedBudget')
  requireNonNegative(input.requiredMaxLockupPeriod, 'requiredMaxLockupPeriod')
  validateApproval(input.approval)

  if (input.subscriptionExists && !input.accountDeployed) {
    throw new ValidationError('A subscription cannot exist before its Boss account')
  }

  const currentFixedBudget = input.currentFixedBudget
  const requestedFixedBudget = input.requestedFixedBudget
  if ((currentFixedBudget === undefined) !== (requestedFixedBudget === undefined)) {
    throw new ValidationError('currentFixedBudget and requestedFixedBudget must be supplied together')
  }
  if (requestedFixedBudget !== undefined && !input.subscriptionExists) {
    throw new ValidationError('Use initialFixedBudget when accepting a new subscription')
  }

  let topUpDelta = 0n
  if (currentFixedBudget !== undefined && requestedFixedBudget !== undefined) {
    requireNonNegative(currentFixedBudget, 'currentFixedBudget')
    requireNonNegative(requestedFixedBudget, 'requestedFixedBudget')
    if (requestedFixedBudget < currentFixedBudget) {
      throw new ValidationError('requestedFixedBudget cannot reduce the current fixed budget')
    }
    topUpDelta = requestedFixedBudget - currentFixedBudget
  }

  const rateUsageIncrease = input.subscriptionExists ? 0n : input.requiredRatePerEpoch
  const lockupUsageIncrease = (input.subscriptionExists ? 0n : input.initialFixedBudget) + topUpDelta
  const minimumRateAllowance = input.approval.rateUsage + rateUsageIncrease
  const minimumLockupAllowance = input.approval.lockupUsage + lockupUsageIncrease
  const requiredApproval = {
    rateAllowance: input.approval.isApproved
      ? max(input.approval.rateAllowance, minimumRateAllowance)
      : minimumRateAllowance,
    lockupAllowance: input.approval.isApproved
      ? max(input.approval.lockupAllowance, minimumLockupAllowance)
      : minimumLockupAllowance,
    maxLockupPeriod: input.approval.isApproved
      ? max(input.approval.maxLockupPeriod, input.requiredMaxLockupPeriod)
      : input.requiredMaxLockupPeriod,
  }

  const steps: BossFundingStep[] = []
  if (input.depositAmount !== 0n) steps.push({ kind: 'deposit', amount: input.depositAmount })

  const consumesOperatorApproval = !input.subscriptionExists || topUpDelta !== 0n
  if (
    consumesOperatorApproval &&
    (!input.approval.isApproved ||
      input.approval.rateAllowance < requiredApproval.rateAllowance ||
      input.approval.lockupAllowance < requiredApproval.lockupAllowance ||
      input.approval.maxLockupPeriod < requiredApproval.maxLockupPeriod)
  ) {
    steps.push({ kind: 'approve-operator', ...requiredApproval })
  }
  if (!input.accountDeployed) steps.push({ kind: 'deploy-account' })
  if (!input.subscriptionExists) steps.push({ kind: 'accept-offer' })
  if (topUpDelta !== 0n && requestedFixedBudget !== undefined) {
    steps.push({ kind: 'top-up-fixed-budget', newFixedBudget: requestedFixedBudget })
  }

  return { requiredApproval, steps }
}

function validateApproval(approval: BossOperatorApprovalState): void {
  requireNonNegative(approval.rateAllowance, 'approval.rateAllowance')
  requireNonNegative(approval.lockupAllowance, 'approval.lockupAllowance')
  requireNonNegative(approval.rateUsage, 'approval.rateUsage')
  requireNonNegative(approval.lockupUsage, 'approval.lockupUsage')
  requireNonNegative(approval.maxLockupPeriod, 'approval.maxLockupPeriod')
}

function max(a: bigint, b: bigint): bigint {
  return a > b ? a : b
}

function requireNonNegative(value: bigint, name: string): void {
  if (value < 0n) throw new ValidationError(`${name} cannot be negative`)
}
