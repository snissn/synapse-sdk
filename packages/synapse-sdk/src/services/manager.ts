import {
  acceptBossOfferCall,
  acknowledgeBossActivationCall,
  activateBossSubscriptionCall,
  authorizeMeteredCharge,
  type BossAcceptanceInput,
  type BossDeploymentManifest,
  type BossFundingPlan,
  type BossFundingPlanInput,
  capacityQuoteValidThrough,
  createBossAccountCall,
  deriveSubscriptionId,
  hashResource,
  hashServiceOffer,
  pauseBossSubscriptionCall,
  planBossFunding,
  quoteCapacityRate,
  quoteFlatRate,
  quoteMeteredGross,
  readBossAccountSnapshot,
  readBossClaimSnapshot,
  readBossPredictedAccount,
  readBossProviderRecord,
  readBossQuoteSnapshot,
  readBossServiceRecord,
  readBossSubscriptionPage,
  readBossSubscriptionSnapshot,
  resolveBossDeployment,
  resumeBossSubscriptionCall,
  settleBossSubscriptionCall,
  submitBossUsageClaimCall,
  syncBossRateCall,
  terminateBossSubscriptionCall,
  topUpBossFixedBudgetCall,
} from '@filoz/synapse-core/boss'
import { operatorApprovals } from '@filoz/synapse-core/pay'
import {
  type Account,
  type Address,
  type Chain,
  type Client,
  type Hash,
  isAddressEqual,
  type TransactionReceipt,
  type Transport,
} from 'viem'
import { getCode, simulateContract, waitForTransactionReceipt, writeContract } from 'viem/actions'
import type { PaymentsService } from '../payments/service.ts'
import { BossServicesPartialCompletionError } from './errors.ts'
import type {
  BossServicesActivationOptions,
  BossServicesAttachOptions,
  BossServicesAttachResult,
  BossServicesCatalogRequest,
  BossServicesClaimOptions,
  BossServicesLifecycleOptions,
  BossServicesPrepareFundingOptions,
  BossServicesPreparedFunding,
  BossServicesQuote,
  BossServicesQuoteInput,
  BossServicesQuoteSnapshotOptions,
  BossServicesReconciliationInput,
  BossServicesReconciliationResult,
  BossServicesResolveAccountResult,
  BossServicesSettleOptions,
  BossServicesStage,
  BossServicesTopUpOptions,
  BossServicesTransactionEvidence,
} from './types.ts'

type ServicesClient = Client<Transport, Chain, Account>
type PaymentsWriter = Pick<PaymentsService, 'approveService' | 'deposit'>
type ContractRequest = {
  readonly abi: readonly unknown[]
  readonly address: Address
  readonly functionName: string
  readonly args?: readonly unknown[]
}
type ExecuteContract = (request: ContractRequest) => Promise<{ hash: Hash; receipt: TransactionReceipt | null }>
type WaitForReceipt = (hash: Hash) => Promise<TransactionReceipt>
type ResolveAccount = (owner: Address) => Promise<Address>

export interface ServicesManagerOptions {
  client: ServicesClient
  deployments?: readonly BossDeploymentManifest[]
  payments: PaymentsWriter
  execute?: ExecuteContract
  waitForReceipt?: WaitForReceipt
  resolveAccount?: ResolveAccount
}

export class ServicesManager {
  private readonly client: ServicesClient
  private readonly deployments: readonly BossDeploymentManifest[]
  private readonly payments: PaymentsWriter
  private readonly executeContract: ExecuteContract
  private readonly wait: WaitForReceipt
  private readonly resolveExpectedAccount: ResolveAccount

  constructor(options: ServicesManagerOptions) {
    this.client = options.client
    this.deployments = options.deployments ?? []
    this.payments = options.payments
    this.executeContract = options.execute ?? ((request) => execute(this.client, request))
    this.wait = options.waitForReceipt ?? ((hash) => waitForTransactionReceipt(this.client, { hash }))
    this.resolveExpectedAccount = options.resolveAccount ?? ((owner) => this.readPredictedAccount(owner))
  }

  deployment(): BossDeploymentManifest {
    const chainId = this.client.chain?.id
    if (chainId == null) throw new Error('Filecoin Boss requires a chain-aware client')
    return resolveBossDeployment(chainId, this.deployments)
  }

  quote(input: BossServicesQuoteInput): BossServicesQuote {
    switch (input.kind) {
      case 'flat': {
        const quote = quoteFlatRate(input)
        return { kind: input.kind, ...quote }
      }
      case 'capacity':
        return {
          kind: input.kind,
          ratePerEpoch: quoteCapacityRate(input),
          validThroughEpoch: capacityQuoteValidThrough(input),
        }
      case 'metered': {
        const rawGross = quoteMeteredGross(input)
        return { kind: input.kind, rawGross, ...authorizeMeteredCharge({ ...input.authorization, rawGross }) }
      }
    }
  }

  planFunding(input: BossFundingPlanInput): BossFundingPlan {
    return planBossFunding(input)
  }

  async resolveAccount(owner: Address = this.client.account.address): Promise<BossServicesResolveAccountResult> {
    const deployment = this.deployment()
    const account = await this.resolveExpectedAccount(owner)
    const code = await getCode(this.client, { address: account })
    return { account, deployed: code != null && code !== '0x', deployment }
  }

  async prepareFunding(input: BossServicesPrepareFundingOptions): Promise<BossServicesPreparedFunding> {
    const { owner: requestedOwner, subscriptionId, ...fundingInput } = input
    const owner = requestedOwner ?? this.client.account.address
    const resolved = await this.resolveAccount(owner)
    const approval = await operatorApprovals(this.client, {
      address: owner,
      operator: resolved.account,
      token: resolved.deployment.dependencies.token,
      contractAddress: resolved.deployment.dependencies.filecoinPay,
    })
    const subscriptionExists =
      subscriptionId == null
        ? false
        : (await this.get({ account: resolved.account, subscriptionId })).exists
    const plan = planBossFunding({
      ...fundingInput,
      accountDeployed: resolved.deployed,
      subscriptionExists,
      approval,
    })
    return { account: resolved.account, accountDeployed: resolved.deployed, subscriptionExists, plan }
  }

  async catalog(requests: readonly BossServicesCatalogRequest[]) {
    const deployment = this.deployment()
    return Promise.all(
      requests.map(async (request) => ({
        request,
        ...(await catalogEntry(this.client, deployment.contracts.BossServiceRegistry.address, request)),
      }))
    )
  }

  async account(account: Address) {
    return readBossAccountSnapshot(this.client, {
      stateView: this.deployment().contracts.BossStateView.address,
      account,
    })
  }

  async list(options: { account: Address; offset?: bigint; limit?: bigint }) {
    return readBossSubscriptionPage(this.client, {
      stateView: this.deployment().contracts.BossStateView.address,
      account: options.account,
      offset: options.offset ?? 0n,
      limit: options.limit ?? 32n,
    })
  }

  async get(options: BossServicesLifecycleOptions) {
    return readBossSubscriptionSnapshot(this.client, {
      stateView: this.deployment().contracts.BossStateView.address,
      ...options,
    })
  }

  async inspectQuote(options: BossServicesQuoteSnapshotOptions) {
    return readBossQuoteSnapshot(this.client, {
      stateView: this.deployment().contracts.BossStateView.address,
      ...options,
    })
  }

  async previewClaim(options: Omit<BossServicesClaimOptions, 'reporterSignature'>) {
    return readBossClaimSnapshot(this.client, {
      stateView: this.deployment().contracts.BossStateView.address,
      account: options.account,
      subscriptionId: options.subscriptionId,
      claim: options.claim,
    })
  }

  async attach(options: BossServicesAttachOptions): Promise<BossServicesAttachResult> {
    const completed: BossServicesTransactionEvidence[] = []
    const deployment = this.deployment()
    const expectedAccount = await this.resolveExpectedAccount(options.owner)
    if (!isAddressEqual(expectedAccount, options.account)) {
      throw new Error(`Boss account ${options.account} does not match predicted account ${expectedAccount}`)
    }

    for (const step of options.plan.steps) {
      try {
        switch (step.kind) {
          case 'deposit': {
            const hash = await this.payments.deposit({ amount: step.amount })
            completed.push({ stage: step.kind, hash, receipt: await this.wait(hash) })
            break
          }
          case 'approve-operator': {
            const hash = await this.payments.approveService({
              service: options.account,
              rateAllowance: step.rateAllowance,
              lockupAllowance: step.lockupAllowance,
              maxLockupPeriod: step.maxLockupPeriod,
            })
            completed.push({ stage: step.kind, hash, receipt: await this.wait(hash) })
            break
          }
          case 'deploy-account':
            completed.push(
              await this.send(
                step.kind,
                createBossAccountCall({
                  factory: deployment.contracts.BossFactory.address,
                  owner: options.owner,
                  filecoinPay: deployment.dependencies.filecoinPay,
                  serviceRegistry: deployment.contracts.BossServiceRegistry.address,
                  adapterRegistry: deployment.contracts.BossAdapterRegistry.address,
                })
              )
            )
            break
          case 'accept-offer':
            completed.push(
              await this.send(step.kind, acceptBossOfferCall({ account: options.account, input: options.acceptance }))
            )
            break
          case 'top-up-fixed-budget': {
            const subscriptionId = this.subscriptionId(options.account, options.acceptance)
            completed.push(
              await this.send(
                step.kind,
                topUpBossFixedBudgetCall({
                  account: options.account,
                  subscriptionId,
                  newFixedBudget: step.newFixedBudget,
                })
              )
            )
            break
          }
        }
      } catch (error) {
        throw new BossServicesPartialCompletionError(step.kind, completed, asError(error))
      }
    }

    return { account: options.account, plan: options.plan, completed }
  }

  async acknowledgeActivation(options: BossServicesActivationOptions) {
    return this.send('acknowledge-activation', acknowledgeBossActivationCall(options))
  }

  async activate(options: BossServicesLifecycleOptions) {
    return this.send('activate', activateBossSubscriptionCall(options))
  }

  async sync(options: BossServicesLifecycleOptions) {
    return this.send('sync', syncBossRateCall(options))
  }

  async submitClaim(options: BossServicesClaimOptions) {
    return this.send('claim', submitBossUsageClaimCall(options))
  }

  async topUp(options: BossServicesTopUpOptions) {
    return this.send('top-up', topUpBossFixedBudgetCall(options))
  }

  async pause(options: BossServicesLifecycleOptions) {
    return this.send('pause', pauseBossSubscriptionCall(options))
  }

  async resume(options: BossServicesLifecycleOptions) {
    return this.send('resume', resumeBossSubscriptionCall(options))
  }

  async stop(options: BossServicesLifecycleOptions) {
    return this.send('stop', terminateBossSubscriptionCall(options))
  }

  async settle(options: BossServicesSettleOptions) {
    return this.send('settle', settleBossSubscriptionCall(options))
  }

  async reconcile(options: BossServicesReconciliationInput): Promise<BossServicesReconciliationResult> {
    const boss = await requiredRead(() => this.get(options))
    const resource = await optionalRead(options.resource)
    const index = await optionalRead(options.index)
    const snapshot = boss.status === 'ok' ? boss.value : null
    return {
      boss,
      pay: snapshot?.exists
        ? { railRead: snapshot.railRead, railAssociationValid: snapshot.railAssociationValid }
        : null,
      resource,
      index,
    }
  }

  private async send(stage: BossServicesStage, request: ContractRequest): Promise<BossServicesTransactionEvidence> {
    const result = await this.executeContract(request)
    return { stage, ...result }
  }

  private async readPredictedAccount(owner: Address) {
    const deployment = this.deployment()
    return readBossPredictedAccount(this.client, {
      factory: deployment.contracts.BossFactory.address,
      owner,
      filecoinPay: deployment.dependencies.filecoinPay,
      serviceRegistry: deployment.contracts.BossServiceRegistry.address,
      adapterRegistry: deployment.contracts.BossAdapterRegistry.address,
    })
  }

  private subscriptionId(account: Address, acceptance: BossAcceptanceInput) {
    return deriveSubscriptionId({
      account,
      offerHash: hashServiceOffer(acceptance.offer),
      resourceKey: hashResource(acceptance.resource),
    })
  }
}

async function execute(client: ServicesClient, request: ContractRequest) {
  const simulation = await simulateContract(client, request as any)
  const hash = await writeContract(client, simulation.request as any)
  return { hash, receipt: await waitForTransactionReceipt(client, { hash }) }
}

async function catalogEntry(client: ServicesClient, registry: Address, request: BossServicesCatalogRequest) {
  const [provider, service] = await Promise.all([
    readBossProviderRecord(client, { registry, provider: request.provider }),
    readBossServiceRecord(client, { registry, provider: request.provider, serviceId: request.serviceId }),
  ])
  return { provider, service }
}

async function requiredRead<T>(reader: () => Promise<T>) {
  try {
    return { status: 'ok' as const, value: await reader() }
  } catch (error) {
    return { status: 'error' as const, error: asError(error) }
  }
}

async function optionalRead(reader: (() => Promise<unknown>) | undefined) {
  if (reader == null) return { status: 'skipped' as const }
  try {
    return { status: 'ok' as const, value: await reader() }
  } catch (error) {
    return { status: 'error' as const, error: asError(error) }
  }
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
