import type { Address, Hex } from 'viem'
import * as z from 'zod'
import { isSynapseError, SynapseError } from '../errors/base.ts'
import { zAddress, zHex } from '../utils/schemas.ts'
import {
  BOSS_ACCOUNT_CREATION_CODE_HASH,
  BOSS_ARTIFACT_SOURCE_COMMIT,
} from './generated.ts'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const nonZeroAddressSchema = zAddress.refine((value) => value !== ZERO_ADDRESS, 'Zero address')
const commitSchema = z.string().regex(/^[0-9a-f]{40}$/)
const hashSchema = zHex.refine((value) => value.length === 66, 'Expected bytes32')
const deploymentSchema = z
  .object({
    address: nonZeroAddressSchema,
    runtimeCodeHash: hashSchema,
    deploymentTxHash: hashSchema,
    deploymentBlock: z.number().int().nonnegative(),
  })
  .strict()

export const bossDeploymentManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    network: z.string().min(1),
    chainId: z.number().int().positive(),
    protocolCommit: commitSchema,
    accountCreationCodeHash: hashSchema,
    deploymentBlock: z.number().int().nonnegative().optional(),
    dependencies: z
      .object({
        filecoinPay: nonZeroAddressSchema,
        pdpVerifier: nonZeroAddressSchema,
        fwssService: nonZeroAddressSchema,
        fwssStateView: nonZeroAddressSchema,
        token: nonZeroAddressSchema,
      })
      .strict(),
    contracts: z
      .object({
        BossFactory: deploymentSchema,
        BossServiceRegistry: deploymentSchema,
        BossAdapterRegistry: deploymentSchema,
        BossBundles: deploymentSchema,
        BossStateView: deploymentSchema,
        FlatRateAdapter: deploymentSchema.optional(),
        PDPCapacityAdapter: deploymentSchema.optional(),
        CappedMeteredAdapter: deploymentSchema.optional(),
        FWSSPDPResourceAdapter: deploymentSchema.optional(),
      })
      .strict(),
  })
  .strict()
  .refine(
    (manifest) => manifest.protocolCommit === BOSS_ARTIFACT_SOURCE_COMMIT,
    'Protocol commit does not match the packaged Boss artifact source'
  )
  .refine(
    (manifest) => manifest.accountCreationCodeHash === BOSS_ACCOUNT_CREATION_CODE_HASH,
    'BossAccount creation code hash does not match the packaged artifact'
  )

export type BossDeploymentManifest = z.infer<typeof bossDeploymentManifestSchema>
export type BossContractDeployment = {
  address: Address
  runtimeCodeHash: Hex
  deploymentTxHash: Hex
  deploymentBlock: number
}

export function parseBossDeploymentManifest(value: unknown): BossDeploymentManifest {
  return bossDeploymentManifestSchema.parse(value)
}

export class BossDeploymentNotFoundError extends SynapseError {
  override name: 'BossDeploymentNotFoundError' = 'BossDeploymentNotFoundError'
  readonly chainId: number

  constructor(chainId: number) {
    super(`No Filecoin Boss deployment is configured for chain ${chainId}.`)
    this.chainId = chainId
  }

  static override is(value: unknown): value is BossDeploymentNotFoundError {
    return isSynapseError(value) && value.name === 'BossDeploymentNotFoundError'
  }
}

export function resolveBossDeployment(
  chainId: number,
  manifests: readonly BossDeploymentManifest[]
): BossDeploymentManifest {
  const manifest = manifests.find((candidate) => candidate.chainId === chainId)
  if (manifest == null) throw new BossDeploymentNotFoundError(chainId)
  return manifest
}
