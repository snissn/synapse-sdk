import type { Address, Hex } from 'viem'
import { ValidationError } from '../errors/base.ts'
import { bossAccountAbi, bossAccountCreationCode, bossFactoryAbi } from './generated.ts'
import type { CapPolicy, ResourceRef, ServiceOffer, UsageClaim } from './types.ts'

export type BossAcceptanceInput = {
  offer: ServiceOffer
  providerSignature: Hex
  resource: ResourceRef
  resourceData: Hex
  pricingData: Hex
  caps: CapPolicy
  initialFixedBudget: bigint
  accessGrantHash: Hex
}

export function createBossAccountCall(options: {
  factory: Address
  owner: Address
  filecoinPay: Address
  serviceRegistry: Address
  adapterRegistry: Address
  accountVersion?: bigint
  accountCreationCode?: Hex
}) {
  const accountVersion = options.accountVersion ?? 1n
  if (accountVersion !== 1n) throw new ValidationError('Boss account version 1 is the only supported version')
  return {
    abi: bossFactoryAbi,
    address: options.factory,
    functionName: 'createAccount',
    args: [
      options.owner,
      options.filecoinPay,
      options.serviceRegistry,
      options.adapterRegistry,
      accountVersion,
      options.accountCreationCode ?? bossAccountCreationCode,
    ],
  } as const
}

export function acceptBossOfferCall(options: { account: Address; input: BossAcceptanceInput }) {
  return {
    abi: bossAccountAbi,
    address: options.account,
    functionName: 'acceptOffer',
    args: [options.input],
  } as const
}

export function acknowledgeBossActivationCall(options: {
  account: Address
  subscriptionId: Hex
  provisioningHash: Hex
  providerSignature: Hex
}) {
  return {
    abi: bossAccountAbi,
    address: options.account,
    functionName: 'acknowledgeActivation',
    args: [options.subscriptionId, options.provisioningHash, options.providerSignature],
  } as const
}

export function activateBossSubscriptionCall(options: { account: Address; subscriptionId: Hex }) {
  return accountSubscriptionCall(options, 'activate')
}

export function syncBossRateCall(options: { account: Address; subscriptionId: Hex }) {
  return accountSubscriptionCall(options, 'syncRate')
}

export function pauseBossSubscriptionCall(options: { account: Address; subscriptionId: Hex }) {
  return accountSubscriptionCall(options, 'pause')
}

export function resumeBossSubscriptionCall(options: { account: Address; subscriptionId: Hex }) {
  return accountSubscriptionCall(options, 'resume')
}

export function terminateBossSubscriptionCall(options: { account: Address; subscriptionId: Hex }) {
  return accountSubscriptionCall(options, 'terminate')
}

export function settleBossSubscriptionCall(options: { account: Address; subscriptionId: Hex; untilEpoch: bigint }) {
  if (options.untilEpoch < 0n) throw new ValidationError('untilEpoch cannot be negative')
  return {
    abi: bossAccountAbi,
    address: options.account,
    functionName: 'settle',
    args: [options.subscriptionId, options.untilEpoch],
  } as const
}

export function submitBossUsageClaimCall(options: {
  account: Address
  subscriptionId: Hex
  claim: UsageClaim
  reporterSignature: Hex
}) {
  return {
    abi: bossAccountAbi,
    address: options.account,
    functionName: 'submitUsageClaim',
    args: [options.subscriptionId, options.claim, options.reporterSignature],
  } as const
}

export function topUpBossFixedBudgetCall(options: {
  account: Address
  subscriptionId: Hex
  newFixedBudget: bigint
}) {
  if (options.newFixedBudget < 0n) throw new ValidationError('newFixedBudget cannot be negative')
  return {
    abi: bossAccountAbi,
    address: options.account,
    functionName: 'topUpFixedBudget',
    args: [options.subscriptionId, options.newFixedBudget],
  } as const
}

function accountSubscriptionCall(
  options: { account: Address; subscriptionId: Hex },
  functionName: 'activate' | 'syncRate' | 'pause' | 'resume' | 'terminate'
) {
  return {
    abi: bossAccountAbi,
    address: options.account,
    functionName,
    args: [options.subscriptionId],
  } as const
}
