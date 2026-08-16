/* globals describe it */

import assert from 'assert'
import type { Address, Hex } from 'viem'
import { keccak256 } from 'viem'
import {
  BOSS_ACCOUNT_CREATION_CODE_HASH,
  BOSS_ARTIFACT_PUBLICATION_COMMIT,
  BOSS_ARTIFACT_SOURCE_COMMIT,
  BossDeploymentNotFoundError,
  bossAbis,
  bossAccountCreationCode,
  bossArtifacts,
  parseBossDeploymentManifest,
  resolveBossDeployment,
} from '../src/boss/index.ts'

const address = (digit: string): Address => `0x${digit.repeat(40)}` as Address
const hash = (digit: string): Hex => `0x${digit.repeat(64)}` as Hex

const manifest = {
  schemaVersion: 1,
  network: 'local-test',
  chainId: 31_415_926,
  protocolCommit: BOSS_ARTIFACT_SOURCE_COMMIT,
  accountCreationCodeHash: BOSS_ACCOUNT_CREATION_CODE_HASH,
  deploymentBlock: 1,
  dependencies: {
    filecoinPay: address('1'),
    pdpVerifier: address('2'),
    fwssService: address('3'),
    fwssStateView: address('4'),
    token: address('5'),
  },
  contracts: {
    BossFactory: {
      address: address('6'),
      runtimeCodeHash: hash('1'),
      deploymentTxHash: hash('2'),
      deploymentBlock: 1,
    },
    BossServiceRegistry: {
      address: address('7'),
      runtimeCodeHash: hash('3'),
      deploymentTxHash: hash('4'),
      deploymentBlock: 1,
    },
    BossAdapterRegistry: {
      address: address('8'),
      runtimeCodeHash: hash('5'),
      deploymentTxHash: hash('6'),
      deploymentBlock: 1,
    },
    BossBundles: {
      address: address('9'),
      runtimeCodeHash: hash('7'),
      deploymentTxHash: hash('8'),
      deploymentBlock: 1,
    },
    BossStateView: {
      address: address('a'),
      runtimeCodeHash: hash('9'),
      deploymentTxHash: hash('a'),
      deploymentBlock: 1,
    },
  },
} as const

describe('Boss artifacts and deployments', () => {
  it('exports the exact generated Boss artifact authority', () => {
    assert.equal(BOSS_ARTIFACT_PUBLICATION_COMMIT, '4295d48f322d5c8950c01fa6f6d92d2391156d19')
    assert.equal(bossArtifacts.sourceCommit, BOSS_ARTIFACT_SOURCE_COMMIT)
    assert.equal(bossArtifacts.protocolCommit, BOSS_ARTIFACT_SOURCE_COMMIT)
    assert.equal(keccak256(bossAccountCreationCode), BOSS_ACCOUNT_CREATION_CODE_HASH)
    assert.equal(Object.keys(bossAbis).length, 10)
    for (const abi of Object.values(bossAbis)) assert.ok(abi.length > 0)
  })

  it('parses and resolves an explicit deployment manifest', () => {
    const parsed = parseBossDeploymentManifest(manifest)
    assert.equal(resolveBossDeployment(parsed.chainId, [parsed]), parsed)
  })

  it('throws a typed error instead of returning zero addresses', () => {
    assert.throws(
      () => resolveBossDeployment(314_159, [parseBossDeploymentManifest(manifest)]),
      (error: unknown) => BossDeploymentNotFoundError.is(error)
    )
    assert.throws(() =>
      parseBossDeploymentManifest({
        ...manifest,
        dependencies: { ...manifest.dependencies, filecoinPay: address('0') },
      })
    )
  })
})
