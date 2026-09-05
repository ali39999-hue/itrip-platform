import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export interface StepHandler {
  execute(context: Record<string, unknown>): Promise<{ success: boolean; result?: Record<string, unknown>; error?: string }>;
  compensate?(context: Record<string, unknown>, stepResult?: Record<string, unknown>): Promise<{ success: boolean; error?: string }>;
}

export class SagaWorker {
  private static handlers: Map<string, StepHandler> = new Map();
  private static isRunning = false;

  static registerStepHandler(stepType: string, handler: StepHandler) {
    this.handlers.set(stepType, handler);
  }

  /**
   * Process pending or stuck sagas (SAGA-001, SAGA-002)
   * Safe under crash recovery: steps already marked SUCCEEDED are never re-executed.
   */
  static async runSagaCycle(workerId: string = `saga_wrk_${crypto.randomBytes(3).toString('hex')}`): Promise<{
    processedSagas: number;
    completedSteps: number;
    failedSteps: number;
  }> {
    if (this.isRunning) return { processedSagas: 0, completedSteps: 0, failedSteps: 0 };
    this.isRunning = true;

    let processedSagas = 0;
    let completedSteps = 0;
    let failedSteps = 0;

    try {
      // 1. Crash Recovery: Recover sagas stranded in RUNNING for longer than 5 minutes
      const staleTime = new Date(Date.now() - 5 * 60 * 1000);
      await prisma.sagaExecution.updateMany({
        where: {
          status: 'RUNNING',
          updatedAt: { lt: staleTime },
        },
        data: {
          status: 'PENDING',
        },
      });

      // 2. Fetch active sagas
      const activeSagas = await prisma.sagaExecution.findMany({
        where: {
          status: { in: ['PENDING', 'RUNNING'] },
        },
        include: {
          steps: {
            orderBy: { id: 'asc' },
          },
        },
        take: 10,
      });

      for (const saga of activeSagas) {
        processedSagas++;

        // Mark saga RUNNING
        if (saga.status !== 'RUNNING') {
          await prisma.sagaExecution.update({
            where: { id: saga.id },
            data: { status: 'RUNNING' },
          });
        }

        const context = JSON.parse(saga.contextJson || '{}');
        let sagaFailed = false;

        for (const step of saga.steps) {
          if (step.status === 'SUCCEEDED' || step.status === 'COMPENSATED') {
            continue; // Already processed, idempotent skip (Crash recovery invariant)
          }

          // Mark step RUNNING
          await prisma.sagaStep.update({
            where: { id: step.id },
            data: {
              status: 'RUNNING',
              startedAt: new Date(),
              attempts: { increment: 1 },
            },
          });

          const handler = this.handlers.get(step.stepType);
          if (!handler) {
            // Default mock handler for demo/standalone steps
            await prisma.sagaStep.update({
              where: { id: step.id },
              data: {
                status: 'SUCCEEDED',
                finishedAt: new Date(),
                resultSnapshot: JSON.stringify({ note: `Auto-succeeded by ${workerId}` }),
              },
            });
            completedSteps++;
            continue;
          }

          try {
            // External execution OUTSIDE database transaction (P0, Section 17)
            const res = await handler.execute(context);

            if (res.success) {
              step.status = 'SUCCEEDED';
              step.resultSnapshot = JSON.stringify(res.result || {});
              await prisma.sagaStep.update({
                where: { id: step.id },
                data: {
                  status: 'SUCCEEDED',
                  finishedAt: new Date(),
                  resultSnapshot: JSON.stringify(res.result || {}),
                },
              });
              completedSteps++;
            } else {
              step.status = 'FAILED';
              failedSteps++;
              sagaFailed = true;
              await prisma.sagaStep.update({
                where: { id: step.id },
                data: {
                  status: 'FAILED',
                  error: res.error || 'Step execution failed',
                },
              });
              break; // Trigger compensation
            }
          } catch (err: unknown) {
            failedSteps++;
            sagaFailed = true;
            await prisma.sagaStep.update({
              where: { id: step.id },
              data: {
                status: 'FAILED',
                error: err instanceof Error ? err.message : String(err),
              },
            });
            break;
          }
        }

        // 3. Compensation handling if any step failed
        if (sagaFailed) {
          await prisma.sagaExecution.update({
            where: { id: saga.id },
            data: { status: 'COMPENSATING' },
          });

          // Run compensation for succeeded steps in reverse order
          const succeededSteps = saga.steps
            .filter((s) => s.status === 'SUCCEEDED')
            .reverse();

          for (const sStep of succeededSteps) {
            const handler = this.handlers.get(sStep.stepType);
            if (handler?.compensate) {
              try {
                await handler.compensate(context, JSON.parse(sStep.resultSnapshot || '{}'));
              } catch (cErr) {
                console.error(`[SagaWorker] Compensation failed on step ${sStep.id}:`, cErr);
              }
            }
            await prisma.sagaStep.update({
              where: { id: sStep.id },
              data: { status: 'COMPENSATED' },
            });
          }

          await prisma.sagaExecution.update({
            where: { id: saga.id },
            data: { status: 'COMPENSATED', finishedAt: new Date() },
          });
        } else {
          // All steps succeeded
          await prisma.sagaExecution.update({
            where: { id: saga.id },
            data: { status: 'SUCCEEDED', finishedAt: new Date() },
          });
        }
      }

      return { processedSagas, completedSteps, failedSteps };
    } finally {
      this.isRunning = false;
    }
  }
}
