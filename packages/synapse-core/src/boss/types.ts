import type { Address, Hex } from 'viem'
import * as z from 'zod'
import { zAddress, zHex } from '../utils/schemas.ts'

export const ResourceKind = {
  FWSS_PDP_DATASET: 0,
  BARE_PDP_DATASET: 1,
  PDP_RESOURCE_SET: 2,
  GENERIC_CONTENT_ROOT: 3,
} as const
export type ResourceKind = (typeof ResourceKind)[keyof typeof ResourceKind]

export const BillingKind = {
  STREAM_FLAT: 0,
  STREAM_CAPACITY: 1,
  METERED_FIXED_LOCKUP: 2,
  ONE_TIME: 3,
} as const
export type BillingKind = (typeof BillingKind)[keyof typeof BillingKind]

export const AssuranceKind = {
  CANCELLABLE_ONLY: 0,
  ONCHAIN_DETERMINISTIC: 1,
  TRUSTED_METERING: 2,
  ATTESTED: 3,
  DISPUTABLE: 4,
} as const
export type AssuranceKind = (typeof AssuranceKind)[keyof typeof AssuranceKind]

export const DependencyKind = {
  NONE: 0,
  SOFT: 1,
  HARD: 2,
} as const
export type DependencyKind = (typeof DependencyKind)[keyof typeof DependencyKind]

export const ActivationKind = {
  IMMEDIATE: 0,
  PROVIDER_ACK: 1,
} as const
export type ActivationKind = (typeof ActivationKind)[keyof typeof ActivationKind]

export const TerminationBillingKind = {
  PAY_THROUGH_FILECOIN_PAY_END: 0,
  ZERO_AFTER_REQUEST: 1,
  ADAPTER_DECIDES: 2,
} as const
export type TerminationBillingKind =
  (typeof TerminationBillingKind)[keyof typeof TerminationBillingKind]

export const SubscriptionState = {
  NONE: 0,
  PENDING_ACTIVATION: 1,
  ACTIVE: 2,
  PAUSED: 3,
  TERMINATING: 4,
  ENDED: 5,
  EXHAUSTED: 6,
} as const
export type SubscriptionState = (typeof SubscriptionState)[keyof typeof SubscriptionState]

export const AdapterKind = {
  RESOURCE: 0,
  PRICING: 1,
} as const
export type AdapterKind = (typeof AdapterKind)[keyof typeof AdapterKind]

export const MAX_UINT256 = (1n << 256n) - 1n
const MAX_UINT64 = (1n << 64n) - 1n
const MAX_UINT16 = (1n << 16n) - 1n

const uint256Schema = z.bigint().min(0n).max(MAX_UINT256)
const uint64Schema = z.bigint().min(0n).max(MAX_UINT64)
const uint16Schema = z.bigint().min(0n).max(MAX_UINT16)
const bytes32Schema = zHex.refine((value) => value.length === 66, 'Expected bytes32')

const resourceKindSchema = z.union([
  z.literal(ResourceKind.FWSS_PDP_DATASET),
  z.literal(ResourceKind.BARE_PDP_DATASET),
  z.literal(ResourceKind.PDP_RESOURCE_SET),
  z.literal(ResourceKind.GENERIC_CONTENT_ROOT),
])
const billingKindSchema = z.union([
  z.literal(BillingKind.STREAM_FLAT),
  z.literal(BillingKind.STREAM_CAPACITY),
  z.literal(BillingKind.METERED_FIXED_LOCKUP),
  z.literal(BillingKind.ONE_TIME),
])
const assuranceKindSchema = z.union([
  z.literal(AssuranceKind.CANCELLABLE_ONLY),
  z.literal(AssuranceKind.ONCHAIN_DETERMINISTIC),
  z.literal(AssuranceKind.TRUSTED_METERING),
  z.literal(AssuranceKind.ATTESTED),
  z.literal(AssuranceKind.DISPUTABLE),
])
const dependencyKindSchema = z.union([
  z.literal(DependencyKind.NONE),
  z.literal(DependencyKind.SOFT),
  z.literal(DependencyKind.HARD),
])
const activationKindSchema = z.union([
  z.literal(ActivationKind.IMMEDIATE),
  z.literal(ActivationKind.PROVIDER_ACK),
])
const terminationBillingKindSchema = z.union([
  z.literal(TerminationBillingKind.PAY_THROUGH_FILECOIN_PAY_END),
  z.literal(TerminationBillingKind.ZERO_AFTER_REQUEST),
  z.literal(TerminationBillingKind.ADAPTER_DECIDES),
])

export const resourceRefSchema = z
  .object({
    kind: resourceKindSchema,
    chainId: uint64Schema,
    anchor: zAddress,
    resourceId: uint256Schema,
    context: bytes32Schema,
  })
  .strict()
export type ResourceRef = z.infer<typeof resourceRefSchema>

export const serviceOfferSchema = z
  .object({
    serviceId: bytes32Schema,
    offerVersion: uint64Schema,
    provider: zAddress,
    signingKey: zAddress,
    beneficiary: zAddress,
    reporter: zAddress,
    token: zAddress,
    resourceAdapter: zAddress,
    pricingAdapter: zAddress,
    serviceType: bytes32Schema,
    billingKind: billingKindSchema,
    assuranceKind: assuranceKindSchema,
    dependencyKind: dependencyKindSchema,
    activationKind: activationKindSchema,
    terminationBillingKind: terminationBillingKindSchema,
    pricingDataHash: bytes32Schema,
    termsHash: bytes32Schema,
    accessScopeHash: bytes32Schema,
    validAfterEpoch: uint64Schema,
    validUntilEpoch: uint64Schema,
    requiredLockupPeriod: uint64Schema,
    quoteTtlEpochs: uint64Schema,
    commissionBps: uint16Schema,
    commissionRecipient: zAddress,
    pauseAllowed: z.boolean(),
    providerMaxRatePerEpoch: uint256Schema,
    providerMaxFixedLockup: uint256Schema,
    nonce: uint256Schema,
  })
  .strict()
export type ServiceOffer = z.infer<typeof serviceOfferSchema>

export const capPolicySchema = z
  .object({
    maxRatePerEpoch: uint256Schema,
    maxFixedLockup: uint256Schema,
    maxSingleCharge: uint256Schema,
    maxChargePerWindow: uint256Schema,
    lifetimeCapGross: uint256Schema,
    chargeWindowEpochs: uint64Schema,
    notAfterEpoch: uint64Schema,
    maxLockupPeriod: uint64Schema,
  })
  .strict()
export type CapPolicy = z.infer<typeof capPolicySchema>

export const usageClaimSchema = z
  .object({
    claimId: bytes32Schema,
    fromEpoch: uint64Schema,
    toEpoch: uint64Schema,
    units: uint256Schema,
    evidenceHash: bytes32Schema,
    evidenceURI: z.string(),
    nonce: uint256Schema,
  })
  .strict()
export type UsageClaim = z.infer<typeof usageClaimSchema>

export interface BossDomain {
  chainId: bigint
  verifyingContract: Address
}

export interface AcceptanceHashInput {
  offerHash: Hex
  resourceKey: Hex
  resourceDataHash: Hex
  pricingDataHash: Hex
  capsHash: Hex
  initialFixedBudget: bigint
  accessGrantHash: Hex
}

export function isUnlimitedCap(cap: bigint): boolean {
  return cap === MAX_UINT256
}

export function remainingCap(cap: bigint, used: bigint): bigint {
  if (isUnlimitedCap(cap)) return MAX_UINT256
  return used >= cap ? 0n : cap - used
}

export function isNoExpiry(notAfterEpoch: bigint): boolean {
  return notAfterEpoch === 0n
}
