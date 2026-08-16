import type { Address, Chain, Client, Hex, Transport } from 'viem'
import { readContract } from 'viem/actions'
import { ValidationError } from '../errors/base.ts'
import { toReadClient } from '../utils/read-client.ts'
import {
  bossAccountCreationCode,
  bossAdapterRegistryAbi,
  bossFactoryAbi,
  bossServiceRegistryAbi,
  bossStateViewAbi,
} from './generated.ts'
import type { ResourceRef, UsageClaim } from './types.ts'

export type BossReadOptions = {
  stateView: Address
  account: Address
}

export function bossAccountSnapshotCall(options: BossReadOptions) {
  return {
    abi: bossStateViewAbi,
    address: options.stateView,
    functionName: 'account',
    args: [options.account],
  } as const
}

export function bossSubscriptionSnapshotCall(options: BossReadOptions & { subscriptionId: Hex }) {
  return {
    abi: bossStateViewAbi,
    address: options.stateView,
    functionName: 'subscription',
    args: [options.account, options.subscriptionId],
  } as const
}

export function bossSubscriptionPageCall(options: BossReadOptions & { offset: bigint; limit: bigint }) {
  if (options.offset < 0n) throw new ValidationError('offset cannot be negative')
  if (options.limit < 1n || options.limit > 32n) throw new ValidationError('limit must be between 1 and 32')
  return {
    abi: bossStateViewAbi,
    address: options.stateView,
    functionName: 'subscriptionPage',
    args: [options.account, options.offset, options.limit],
  } as const
}

export function bossQuoteSnapshotCall(
  options: BossReadOptions & {
    subscriptionId: Hex
    resource: ResourceRef
    resourceData: Hex
    pricingData: Hex
  }
) {
  return {
    abi: bossStateViewAbi,
    address: options.stateView,
    functionName: 'quote',
    args: [options.account, options.subscriptionId, options.resource, options.resourceData, options.pricingData],
  } as const
}

export function bossClaimSnapshotCall(options: BossReadOptions & { subscriptionId: Hex; claim: UsageClaim }) {
  return {
    abi: bossStateViewAbi,
    address: options.stateView,
    functionName: 'claim',
    args: [options.account, options.subscriptionId, options.claim],
  } as const
}

export function bossPredictAccountCall(options: {
  factory: Address
  owner: Address
  filecoinPay: Address
  serviceRegistry: Address
  adapterRegistry: Address
  accountVersion?: bigint
  accountCreationCode?: Hex
}) {
  return {
    abi: bossFactoryAbi,
    address: options.factory,
    functionName: 'predictAccount',
    args: [
      options.owner,
      options.filecoinPay,
      options.serviceRegistry,
      options.adapterRegistry,
      options.accountVersion ?? 1n,
      options.accountCreationCode ?? bossAccountCreationCode,
    ],
  } as const
}

export function bossProviderCall(options: { registry: Address; provider: Address }) {
  return {
    abi: bossServiceRegistryAbi,
    address: options.registry,
    functionName: 'getProvider',
    args: [options.provider],
  } as const
}

export function bossServiceCall(options: { registry: Address; provider: Address; serviceId: Hex }) {
  return {
    abi: bossServiceRegistryAbi,
    address: options.registry,
    functionName: 'getService',
    args: [options.provider, options.serviceId],
  } as const
}

export function bossAdapterCall(options: { registry: Address; adapter: Address }) {
  return {
    abi: bossAdapterRegistryAbi,
    address: options.registry,
    functionName: 'getAdapter',
    args: [options.adapter],
  } as const
}

export async function readBossAccountSnapshot(client: Client<Transport, Chain>, options: BossReadOptions) {
  return readContract(toReadClient(client), bossAccountSnapshotCall(options))
}

export async function readBossSubscriptionSnapshot(
  client: Client<Transport, Chain>,
  options: BossReadOptions & { subscriptionId: Hex }
) {
  return readContract(toReadClient(client), bossSubscriptionSnapshotCall(options))
}

export async function readBossSubscriptionPage(
  client: Client<Transport, Chain>,
  options: BossReadOptions & { offset: bigint; limit: bigint }
) {
  return readContract(toReadClient(client), bossSubscriptionPageCall(options))
}

export async function readBossQuoteSnapshot(
  client: Client<Transport, Chain>,
  options: BossReadOptions & {
    subscriptionId: Hex
    resource: ResourceRef
    resourceData: Hex
    pricingData: Hex
  }
) {
  return readContract(toReadClient(client), bossQuoteSnapshotCall(options))
}

export async function readBossClaimSnapshot(
  client: Client<Transport, Chain>,
  options: BossReadOptions & { subscriptionId: Hex; claim: UsageClaim }
) {
  return readContract(toReadClient(client), bossClaimSnapshotCall(options))
}
