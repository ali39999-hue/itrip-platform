/**
 * QR-001 / QR-002 / QR-003: Quality Gate Evaluator & Provenance Verifier
 *
 * Implements strict rules:
 * - PASS = gate actually executed + same commit + same version + artifact exists + command succeeded
 * - Anything else fails closed (MISSING_ARTIFACT, STALE_ARTIFACT, WRONG_COMMIT, WRONG_VERSION, NOT_RUN, FAIL)
 */

export type QualityGateVerdict =
  | 'PASS'
  | 'FAIL'
  | 'NOT_RUN'
  | 'MISSING_ARTIFACT'
  | 'STALE_ARTIFACT'
  | 'WRONG_COMMIT'
  | 'WRONG_VERSION';

export interface GateArtifactRecord {
  commit?: string | null;
  version?: string | null;
  status?: string | null;
  numFailedTests?: number | null;
  numPassedTests?: number | null;
  exitCode?: number | null;
  recordedAt?: string | null;
}

export interface GateEvaluationContext {
  currentCommit: string;
  currentVersion: string;
  artifact?: GateArtifactRecord | null;
}

export interface GateEvaluationResult {
  verdict: QualityGateVerdict;
  ok: boolean;
  status: 'PASS' | 'FAIL' | 'STALE' | 'not-run';
  reason?: string;
}

export function evaluateGateArtifact(ctx: GateEvaluationContext): GateEvaluationResult {
  if (!ctx.artifact) {
    return {
      verdict: 'MISSING_ARTIFACT',
      ok: false,
      status: 'not-run',
      reason: 'Artifact file is missing or unreadable',
    };
  }

  const { artifact, currentCommit, currentVersion } = ctx;

  if (!artifact.commit || artifact.commit === 'unknown') {
    return {
      verdict: 'STALE_ARTIFACT',
      ok: false,
      status: 'STALE',
      reason: 'Artifact has no commit provenance',
    };
  }

  if (artifact.commit !== currentCommit) {
    return {
      verdict: 'WRONG_COMMIT',
      ok: false,
      status: 'STALE',
      reason: `Artifact stamped for commit ${String(artifact.commit).slice(0, 12)} — current is ${String(currentCommit).slice(0, 12)}`,
    };
  }

  if (artifact.version && artifact.version !== currentVersion) {
    return {
      verdict: 'WRONG_VERSION',
      ok: false,
      status: 'STALE',
      reason: `Artifact version ${artifact.version} does not match current version ${currentVersion}`,
    };
  }

  if (artifact.status === 'not-run') {
    return {
      verdict: 'NOT_RUN',
      ok: false,
      status: 'not-run',
      reason: 'Gate was explicitly recorded as not-run',
    };
  }

  if (
    artifact.status === 'FAIL' ||
    (typeof artifact.numFailedTests === 'number' && artifact.numFailedTests > 0) ||
    (typeof artifact.exitCode === 'number' && artifact.exitCode !== 0)
  ) {
    return {
      verdict: 'FAIL',
      ok: false,
      status: 'FAIL',
      reason: 'Gate execution failed or reported failing tests',
    };
  }

  if (
    artifact.status === 'PASS' ||
    (typeof artifact.numFailedTests === 'number' &&
      artifact.numFailedTests === 0 &&
      typeof artifact.numPassedTests === 'number' &&
      artifact.numPassedTests > 0)
  ) {
    return {
      verdict: 'PASS',
      ok: true,
      status: 'PASS',
    };
  }

  return {
    verdict: 'FAIL',
    ok: false,
    status: 'FAIL',
    reason: 'Artifact does not satisfy passing criteria',
  };
}
