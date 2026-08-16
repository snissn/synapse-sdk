import type {
  BossAcceptanceInput,
  BossDeploymentManifest,
  BossFundingPlan,
  BossFundingPlanInput,
  BossFundingStep,
  MeteredAuthorization,
  ResourceRef,
  UsageClaim,
} from '@filoz/synapse-core/boss'
import type { Address, Hash, Hex, TransactionReceipt } from 'viem'

export type BossServicesStage =
  | BossFundingStep['kind']
  | 'acknowledge-activation'
  | 'activate'
  | 'sync'
  | 'claim'
  | 'top-up'
  | 'pause'
  | 'resume'
  | 'stop'
  | 'settle'

export interface BossServicesTransactionEvidence {
  stage: BossServicesStage
  hash: Hash
  receipt: TransactionReceipt | null
}

export interface BossServicesAttachOptions {
  owner: Address
  account: Address
  acceptance: BossAcceptanceInput
  plan: BossFundingPlan
}

export interface BossServicesAttachResult {
  account: Address
  plan: BossFundingPlan
  completed: BossServicesTransactionEvidence[]
}

export type BossServicesQuoteInput =
  | {
      kind: 'flat'
      grossPricePerPeriod: bigint
      periodEpochs: bigint
    }
  | {
      kind: 'capacity'
      sizeInBytes: bigint
      grossPricePerTiBPerPeriod: bigint
      periodEpochs: bigint
      billable: boolean
      quoteEpoch: bigint
      quoteTtlEpochs: bigint
      notAfterEpoch: bigint
    }
  | {
      kind: 'metered'
      units: bigint
      grossPricePerTiB: bigint
      authorization: Omit<MeteredAuthorization, 'rawGross'>
    }

export type BossServicesQuote =
  | {
      kind: 'flat'
      ratePerEpoch: bigint
      remainder: bigint
    }
  | {
      kind: 'capacity'
      ratePerEpoch: bigint
      validThroughEpoch: bigint
    }
  | {
      kind: 'metered'
      rawGross: bigint
      chargedGross: bigint
      remainingWindowGross: bigint
      remainingLifetimeGross: bigint
    }

export interface BossServicesCatalogRequest {
  provider: Address
  serviceId: Hex
}

export interface BossServicesResolveAccountResult {
  account: Address
  deployed: boolean
  deployment: BossDeploymentManifest
}

export interface BossServicesReconciliationInput {
  account: Address
  subscriptionId: Hex
  resource?: () => Promise<unknown>
  index?: () => Promise<unknown>
}

export type BossServicesReadResult<T = unknown> =
  | { status: 'ok'; value: T }
  | { status: 'error'; error: Error }

export type BossServicesOptionalReadResult =
  | { status: 'skipped' }
  | { status: 'ok'; value: unknown }
  | { status: 'error'; error: Error }

export interface BossServicesReconciliationResult {
  boss: BossServicesReadResult
  pay: {
    railRead: boolean
    railAssociationValid: boolean
  } | null
  resource: BossServicesOptionalReadResult
  index: BossServicesOptionalReadResult
}

export type BossServicesPrepareFundingOptions = Omit<
  BossFundingPlanInput,
  'accountDeployed' | 'subscriptionExists' | 'approval'
> & {
  owner?: Address
  subscriptionId?: Hex
}

export interface BossServicesPreparedFunding {
  account: Address
  accountDeployed: boolean
  subscriptionExists: boolean
  plan: BossFundingPlan
}

export interface BossServicesLifecycleOptions {
  account: Address
  subscriptionId: Hex
}

export interface BossServicesClaimOptions extends BossServicesLifecycleOptions {
  claim: UsageClaim
  reporterSignature: Hex
}

export interface BossServicesActivationOptions extends BossServicesLifecycleOptions {
  provisioningHash: Hex
  providerSignature: Hex
}

export interface BossServicesSettleOptions extends BossServicesLifecycleOptions {
  untilEpoch: bigint
}

export interface BossServicesTopUpOptions extends BossServicesLifecycleOptions {
  newFixedBudget: bigint
}

export interface BossServicesQuoteSnapshotOptions extends BossServicesLifecycleOptions {
  resource: ResourceRef
  resourceData: Hex
  pricingData: Hex
}

export type { BossFundingPlan, BossFundingPlanInput }
