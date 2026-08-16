import { isSynapseError, SynapseError } from '@filoz/synapse-core/errors'
import type { BossServicesStage, BossServicesTransactionEvidence } from './types.ts'

export class BossServicesPartialCompletionError extends SynapseError {
  override name: 'BossServicesPartialCompletionError' = 'BossServicesPartialCompletionError'
  readonly failedStage: BossServicesStage
  readonly completed: BossServicesTransactionEvidence[]

  constructor(failedStage: BossServicesStage, completed: BossServicesTransactionEvidence[], cause: Error) {
    super(`Filecoin Boss operation failed at stage "${failedStage}".`, { cause })
    this.failedStage = failedStage
    this.completed = completed
  }

  static override is(value: unknown): value is BossServicesPartialCompletionError {
    return isSynapseError(value) && value.name === 'BossServicesPartialCompletionError'
  }
}
