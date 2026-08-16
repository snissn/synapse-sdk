import { ValidationError } from '../errors/base.ts'
import { remainingCap } from './types.ts'

export const BYTES_PER_TIB = 1n << 40n
const MAX_UINT64 = (1n << 64n) - 1n

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
  requireNonNegative(terms.grossPricePerPeriod, 'grossPricePerPeriod')
  requirePositive(terms.periodEpochs, 'periodEpochs')
  return {
    ratePerEpoch: terms.grossPricePerPeriod / terms.periodEpochs,
    remainder: terms.grossPricePerPeriod % terms.periodEpochs,
  }
}

export function quoteCapacityRate(terms: CapacityRateTerms): bigint {
  requireNonNegative(terms.sizeInBytes, 'sizeInBytes')
  requirePositive(terms.grossPricePerTiBPerPeriod, 'grossPricePerTiBPerPeriod')
  requirePositive(terms.periodEpochs, 'periodEpochs')
  if (!terms.billable) return 0n
  return (terms.sizeInBytes * terms.grossPricePerTiBPerPeriod) / (BYTES_PER_TIB * terms.periodEpochs)
}

export function quoteMeteredGross(terms: MeteredTerms): bigint {
  requireNonNegative(terms.units, 'units')
  requirePositive(terms.grossPricePerTiB, 'grossPricePerTiB')
  return (terms.units * terms.grossPricePerTiB) / BYTES_PER_TIB
}

export function authorizeMeteredCharge(input: MeteredAuthorization): {
  chargedGross: bigint
  remainingWindowGross: bigint
  remainingLifetimeGross: bigint
} {
  for (const [name, value] of Object.entries(input)) requireNonNegative(value, name)

  const windowRemaining = remainingCap(input.maxChargePerWindow, input.windowGross)
  const lifetimeRemaining = remainingCap(input.lifetimeCapGross, input.lifetimeGross)
  const chargedGross = min(input.rawGross, input.maxSingleCharge, windowRemaining, lifetimeRemaining, input.fixedLockup)

  return {
    chargedGross,
    remainingWindowGross: windowRemaining - chargedGross,
    remainingLifetimeGross: lifetimeRemaining - chargedGross,
  }
}

export function capacityQuoteValidThrough(options: {
  quoteEpoch: bigint
  quoteTtlEpochs: bigint
  notAfterEpoch: bigint
  billable: boolean
}): bigint {
  requireUint64(options.quoteEpoch, 'quoteEpoch')
  requirePositive(options.quoteTtlEpochs, 'quoteTtlEpochs')
  requireUint64(options.quoteTtlEpochs, 'quoteTtlEpochs')
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

function requirePositive(value: bigint, name: string): void {
  if (value <= 0n) throw new ValidationError(`${name} must be positive`)
}

function requireNonNegative(value: bigint, name: string): void {
  if (value < 0n) throw new ValidationError(`${name} cannot be negative`)
}

function requireUint64(value: bigint, name: string): void {
  requireNonNegative(value, name)
  if (value > MAX_UINT64) throw new ValidationError(`${name} exceeds uint64`)
}
