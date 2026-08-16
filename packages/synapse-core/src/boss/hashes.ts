import {
  concatHex,
  encodeAbiParameters,
  keccak256,
  stringToHex,
  type Address,
  type Hex,
} from 'viem'
import type {
  AcceptanceHashInput,
  BossDomain,
  CapPolicy,
  ResourceRef,
  ServiceOffer,
  UsageClaim,
} from './types.ts'

const EIP712_DOMAIN_TYPE =
  'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
const SERVICE_OFFER_TYPE =
  'ServiceOffer(bytes32 serviceId,uint64 offerVersion,address provider,address signingKey,address beneficiary,address reporter,address token,address resourceAdapter,address pricingAdapter,bytes32 serviceType,uint8 billingKind,uint8 assuranceKind,uint8 dependencyKind,uint8 activationKind,uint8 terminationBillingKind,bytes32 pricingDataHash,bytes32 termsHash,bytes32 accessScopeHash,uint64 validAfterEpoch,uint64 validUntilEpoch,uint64 requiredLockupPeriod,uint64 quoteTtlEpochs,uint16 commissionBps,address commissionRecipient,bool pauseAllowed,uint256 providerMaxRatePerEpoch,uint256 providerMaxFixedLockup,uint256 nonce)'
const CAP_POLICY_TYPE =
  'CapPolicy(uint256 maxRatePerEpoch,uint256 maxFixedLockup,uint256 maxSingleCharge,uint256 maxChargePerWindow,uint256 lifetimeCapGross,uint64 chargeWindowEpochs,uint64 notAfterEpoch,uint64 maxLockupPeriod)'
const ACCEPTANCE_TYPE =
  'Acceptance(bytes32 offerHash,bytes32 resourceKey,bytes32 resourceDataHash,bytes32 pricingDataHash,bytes32 capsHash,uint256 initialFixedBudget,bytes32 accessGrantHash)'
const USAGE_CLAIM_TYPE =
  'UsageClaim(bytes32 subscriptionId,bytes32 claimId,uint64 fromEpoch,uint64 toEpoch,uint256 units,bytes32 evidenceHash,bytes32 evidenceURIHash,uint256 nonce)'

export const EIP712_DOMAIN_TYPEHASH = keccak256(stringToHex(EIP712_DOMAIN_TYPE))
export const SERVICE_OFFER_TYPEHASH = keccak256(stringToHex(SERVICE_OFFER_TYPE))
export const CAP_POLICY_TYPEHASH = keccak256(stringToHex(CAP_POLICY_TYPE))
export const ACCEPTANCE_TYPEHASH = keccak256(stringToHex(ACCEPTANCE_TYPE))
export const USAGE_CLAIM_TYPEHASH = keccak256(stringToHex(USAGE_CLAIM_TYPE))

const NAME_HASH = keccak256(stringToHex('Filecoin Boss'))
const VERSION_HASH = keccak256(stringToHex('1'))

export function hashResource(resource: ResourceRef): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'string' },
        { type: 'uint8' },
        { type: 'uint64' },
        { type: 'address' },
        { type: 'uint256' },
        { type: 'bytes32' },
      ],
      [
        'FILECOIN_BOSS_RESOURCE_V1',
        resource.kind,
        resource.chainId,
        resource.anchor,
        resource.resourceId,
        resource.context,
      ]
    )
  )
}

export function hashServiceOffer(offer: ServiceOffer): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'bytes32' },
        {
          type: 'tuple',
          components: [
            { name: 'serviceId', type: 'bytes32' },
            { name: 'offerVersion', type: 'uint64' },
            { name: 'provider', type: 'address' },
            { name: 'signingKey', type: 'address' },
            { name: 'beneficiary', type: 'address' },
            { name: 'reporter', type: 'address' },
            { name: 'token', type: 'address' },
            { name: 'resourceAdapter', type: 'address' },
            { name: 'pricingAdapter', type: 'address' },
            { name: 'serviceType', type: 'bytes32' },
            { name: 'billingKind', type: 'uint8' },
            { name: 'assuranceKind', type: 'uint8' },
            { name: 'dependencyKind', type: 'uint8' },
            { name: 'activationKind', type: 'uint8' },
            { name: 'terminationBillingKind', type: 'uint8' },
            { name: 'pricingDataHash', type: 'bytes32' },
            { name: 'termsHash', type: 'bytes32' },
            { name: 'accessScopeHash', type: 'bytes32' },
            { name: 'validAfterEpoch', type: 'uint64' },
            { name: 'validUntilEpoch', type: 'uint64' },
            { name: 'requiredLockupPeriod', type: 'uint64' },
            { name: 'quoteTtlEpochs', type: 'uint64' },
            { name: 'commissionBps', type: 'uint16' },
            { name: 'commissionRecipient', type: 'address' },
            { name: 'pauseAllowed', type: 'bool' },
            { name: 'providerMaxRatePerEpoch', type: 'uint256' },
            { name: 'providerMaxFixedLockup', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
          ],
        },
      ],
      [SERVICE_OFFER_TYPEHASH, { ...offer, commissionBps: Number(offer.commissionBps) }]
    )
  )
}

export function hashCapPolicy(caps: CapPolicy): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'bytes32' },
        {
          type: 'tuple',
          components: [
            { name: 'maxRatePerEpoch', type: 'uint256' },
            { name: 'maxFixedLockup', type: 'uint256' },
            { name: 'maxSingleCharge', type: 'uint256' },
            { name: 'maxChargePerWindow', type: 'uint256' },
            { name: 'lifetimeCapGross', type: 'uint256' },
            { name: 'chargeWindowEpochs', type: 'uint64' },
            { name: 'notAfterEpoch', type: 'uint64' },
            { name: 'maxLockupPeriod', type: 'uint64' },
          ],
        },
      ],
      [CAP_POLICY_TYPEHASH, caps]
    )
  )
}

export function hashAcceptance(input: AcceptanceHashInput): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'uint256' },
        { type: 'bytes32' },
      ],
      [
        ACCEPTANCE_TYPEHASH,
        input.offerHash,
        input.resourceKey,
        input.resourceDataHash,
        input.pricingDataHash,
        input.capsHash,
        input.initialFixedBudget,
        input.accessGrantHash,
      ]
    )
  )
}

export function hashUsageClaim(subscriptionId: Hex, claim: UsageClaim): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'uint64' },
        { type: 'uint64' },
        { type: 'uint256' },
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'uint256' },
      ],
      [
        USAGE_CLAIM_TYPEHASH,
        subscriptionId,
        claim.claimId,
        claim.fromEpoch,
        claim.toEpoch,
        claim.units,
        claim.evidenceHash,
        keccak256(stringToHex(claim.evidenceURI)),
        claim.nonce,
      ]
    )
  )
}

export function getBossDomainSeparator(domain: BossDomain): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'uint256' },
        { type: 'address' },
      ],
      [
        EIP712_DOMAIN_TYPEHASH,
        NAME_HASH,
        VERSION_HASH,
        domain.chainId,
        domain.verifyingContract,
      ]
    )
  )
}

export function hashTypedData(domainSeparator: Hex, structHash: Hex): Hex {
  return keccak256(concatHex(['0x1901', domainSeparator, structHash]))
}

export function deriveSubscriptionId(input: {
  account: Address
  offerHash: Hex
  resourceKey: Hex
}): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: 'string' }, { type: 'address' }, { type: 'bytes32' }, { type: 'bytes32' }],
      ['FILECOIN_BOSS_SUBSCRIPTION_V1', input.account, input.offerHash, input.resourceKey]
    )
  )
}
