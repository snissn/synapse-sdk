import { ValidationError } from '../errors/base.ts'
import { remainingCap } from './types.ts'

export const BYTES_PER_TIB = 1n << 40n
const MAX_UINT64 = (1n << 64n) - 1n
const MAX_UINT256 = (1n << 256n) - 1n

type FlatRateTerms = {
  grossPricePerPeriod: bigint
  periodEpochs: bigint
}

type CapacityRateTerms = {
  sizeInBytes: bigint
  grossPricePerTiBPerPeriod: bigint
  periodEpochs: bigint
  billable: boolean
}

type MeteredTerms = {
  units: bigint
  grossPricePerTiB: bigint
}

export type MeteredAuthorization = {
  rawGross: bigint
  maxSingleCharge: bigint
  windowGross: bigint
  maxChargePerWindow: bigint
  lifetimeGross: bigint
  lifetimeCapGross: bigint
  fixedLockup: bigint
}

export function quoteFlatRate(terms: FlatRateTerms): { ratePerEpoch: bigint; remainder: bigint } {
  requireUint256(terms.grossPricePerPeriod, 'grossPricePerPeriod')
  requirePositiveUint64(terms.periodEpochs, 'periodEpochs')
  return {
    ratePerEpoch: terms.grossPricePerPeriod / terms.periodEpochs,
    remainder: terms.grossPricePerPeriod % terms.periodEpochs,
  }
}

export function quoteCapacityRate(terms: CapacityRateTerms): bigint {
  requireUint256(terms.sizeInBytes, 'sizeInBytes')
  requirePositiveUint256(terms.grossPricePerTiBPerPeriod, 'grossPricePerTiBPerPeriod')
  requirePositiveUint64(terms.periodEpochs, 'periodEpochs')
  if (!terms.billable) return 0n

  const result = (terms.sizeInBytes * terms.grossPricePerTiBPerPeriod) / (BYTES_PER_TIB * terms.periodEpochs)
  requireUint256(result, 'capacity rate')
  return result
}

export function quoteMeteredGross(terms: MeteredTerms): bigint {
  requireUint256(terms.units, 'units')
  requirePositiveUint256(terms.grossPricePerTiB, 'grossPricePerTiB')

  const result = (terms.units * terms.grossPricePerTiB) / BYTES_PER_TIB
  requireUint256(result, 'metered gross')
  return result
}

export function authorizeMeteredCharge(input: MeteredAuthorization): {
  chargedGross: bigint
  remainingWindowGross: bigint
  remainingLifetimeGross: bigint
} {
  for (const [name, value] of Object.entries(input)) requireUint256(value, name)

  const windowRemaining = remainingCap(input.maxChargePerWindow, input.windowGross)
  const lifetimeRemaining = remainingCap(input.lifetimeCapGross, input.lifetimeGross)
  const chargedGross = min(input.rawGross, input.maxSingleCharge, windowRemaining, lifetimeRemaining, input.fixedLockup)
  const nextWindowGross = input.windowGross + chargedGross
  const nextLifetimeGross = input.lifetimeGross + chargedGross
  requireUint256(nextWindowGross, 'windowGross + chargedGross')
  requireUint256(nextLifetimeGross, 'lifetimeGross + chargedGross')

  return {
    chargedGross,
    remainingWindowGross: remainingCap(input.maxChargePerWindow, nextWindowGross),
    remainingLifetimeGross: remainingCap(input.lifetimeCapGross, nextLifetimeGross),
  }
}

export function capacityQuoteValidThrough(options: {
  quoteEpoch: bigint
  quoteTtlEpochs: bigint
  notAfterEpoch: bigint
  billable: boolean
}): bigint {
  requireUint64(options.quoteEpoch, 'quoteEpoch')
  requirePositiveUint64(options.quoteTtlEpochs, 'quoteTtlEpochs')
  requireUint64(options.notAfterEpoch, 'notAfterEpoch')
  if (!options.billable) return options.quoteEpoch

  const ttlEnd = options.quoteEpoch + options.quoteTtlEpochs
  if (ttlEnd > MAX_UINT64) throw new ValidationError('quoteEpoch + quoteTtlEpochs exceeds uint64')
  return options.notAfterEpoch !== 0n && options.notAfterEpoch < ttlEnd ? options.notAfterEpoch : ttlEnd
}

export function isBossQuoteFresh(currentEpoch: bigint, validThroughEpoch: bigint): boolean {
  requireNonNegative(currentEpoch, 'currentEpoch')
  requireNonNegative(validThroughEpoch, 'validThroughEpoch')
  return currentEpoch < validThroughEpoch
}

function min(first: bigint, ...rest: bigint[]): bigint {
  let result = first
  for (const value of rest) if (value < result) result = value
  return result
}

function requireNonNegative(value: bigint, name: string): void {
  if (value < 0n) throw new ValidationError(`${name} cannot be negative`)
}

function requireUint64(value: bigint, name: string): void {
  requireNonNegative(value, name)
  if (value > MAX_UINT64) throw new ValidationError(`${name} exceeds uint64`)
}

function requireUint256(value: bigint, name: string): void {
  requireNonNegative(value, name)
  if (value > MAX_UINT256) throw new ValidationError(`${name} exceeds uint256`)
}

function requirePositiveUint64(value: bigint, name: string): void {
  requireUint64(value, name)
  if (value === 0n) throw new ValidationError(`${name} must be positive`)
}

function requirePositiveUint256(value: bigint, name: string): void {
  requireUint256(value, name)
  if (value === 0n) throw new ValidationError(`${name} must be positive`)
}
