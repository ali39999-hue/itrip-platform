import { describe, it, expect } from 'vitest';
import {
  evaluateGateArtifact,
  type GateArtifactRecord,
} from './quality-gate-evaluator';

describe('Quality Gate Evaluator & Provenance Invariants (QR-001 / QR-002 / QR-003)', () => {
  const CURRENT_COMMIT = 'f6c16800a60059f0142b47d9367a9023e5aa28ff';
  const CURRENT_VERSION = '1.8.4';

  it('verifies PASS when gate was executed, commit matches, version matches, and zero failures', () => {
    const artifact: GateArtifactRecord = {
      status: 'PASS',
      commit: CURRENT_COMMIT,
      version: CURRENT_VERSION,
      numPassedTests: 1095,
      numFailedTests: 0,
      recordedAt: new Date().toISOString(),
    };

    const res = evaluateGateArtifact({
      currentCommit: CURRENT_COMMIT,
      currentVersion: CURRENT_VERSION,
      artifact,
    });

    expect(res.verdict).toBe('PASS');
    expect(res.ok).toBe(true);
    expect(res.status).toBe('PASS');
  });

  it('rejects with FAIL when tests failed or status is FAIL', () => {
    const artifactFailedTests: GateArtifactRecord = {
      status: 'FAIL',
      commit: CURRENT_COMMIT,
      version: CURRENT_VERSION,
      numPassedTests: 1090,
      numFailedTests: 5,
    };

    const res1 = evaluateGateArtifact({
      currentCommit: CURRENT_COMMIT,
      currentVersion: CURRENT_VERSION,
      artifact: artifactFailedTests,
    });

    expect(res1.verdict).toBe('FAIL');
    expect(res1.ok).toBe(false);
    expect(res1.status).toBe('FAIL');

    const artifactExitCode: GateArtifactRecord = {
      exitCode: 1,
      commit: CURRENT_COMMIT,
      version: CURRENT_VERSION,
    };

    const res2 = evaluateGateArtifact({
      currentCommit: CURRENT_COMMIT,
      currentVersion: CURRENT_VERSION,
      artifact: artifactExitCode,
    });

    expect(res2.verdict).toBe('FAIL');
    expect(res2.ok).toBe(false);
  });

  it('rejects with NOT_RUN when gate status was explicitly not-run', () => {
    const artifactNotRun: GateArtifactRecord = {
      status: 'not-run',
      commit: CURRENT_COMMIT,
      version: CURRENT_VERSION,
    };

    const res = evaluateGateArtifact({
      currentCommit: CURRENT_COMMIT,
      currentVersion: CURRENT_VERSION,
      artifact: artifactNotRun,
    });

    expect(res.verdict).toBe('NOT_RUN');
    expect(res.ok).toBe(false);
    expect(res.status).toBe('not-run');
  });

  it('rejects with MISSING_ARTIFACT when artifact file is missing or null', () => {
    const res = evaluateGateArtifact({
      currentCommit: CURRENT_COMMIT,
      currentVersion: CURRENT_VERSION,
      artifact: null,
    });

    expect(res.verdict).toBe('MISSING_ARTIFACT');
    expect(res.ok).toBe(false);
    expect(res.status).toBe('not-run');
    expect(res.reason).toContain('missing');
  });

  it('rejects with STALE_ARTIFACT when commit is unknown or missing provenance', () => {
    const artifactUnknown: GateArtifactRecord = {
      status: 'PASS',
      commit: 'unknown',
      version: CURRENT_VERSION,
    };

    const res1 = evaluateGateArtifact({
      currentCommit: CURRENT_COMMIT,
      currentVersion: CURRENT_VERSION,
      artifact: artifactUnknown,
    });

    expect(res1.verdict).toBe('STALE_ARTIFACT');
    expect(res1.ok).toBe(false);
    expect(res1.status).toBe('STALE');

    const artifactNoCommit: GateArtifactRecord = {
      status: 'PASS',
      commit: null,
      version: CURRENT_VERSION,
    };

    const res2 = evaluateGateArtifact({
      currentCommit: CURRENT_COMMIT,
      currentVersion: CURRENT_VERSION,
      artifact: artifactNoCommit,
    });

    expect(res2.verdict).toBe('STALE_ARTIFACT');
    expect(res2.ok).toBe(false);
  });

  it('rejects with WRONG_COMMIT when artifact was stamped for a previous commit', () => {
    const previousCommit = 'de150f55ab673c61a8818186b31b98a840af8fee';
    const artifactWrongCommit: GateArtifactRecord = {
      status: 'PASS',
      commit: previousCommit,
      version: CURRENT_VERSION,
    };

    const res = evaluateGateArtifact({
      currentCommit: CURRENT_COMMIT,
      currentVersion: CURRENT_VERSION,
      artifact: artifactWrongCommit,
    });

    expect(res.verdict).toBe('WRONG_COMMIT');
    expect(res.ok).toBe(false);
    expect(res.status).toBe('STALE');
    expect(res.reason).toContain('de150f55ab67');
  });

  it('rejects with WRONG_VERSION when artifact was produced for an older package version', () => {
    const artifactWrongVersion: GateArtifactRecord = {
      status: 'PASS',
      commit: CURRENT_COMMIT,
      version: '1.8.3', // older version
    };

    const res = evaluateGateArtifact({
      currentCommit: CURRENT_COMMIT,
      currentVersion: CURRENT_VERSION,
      artifact: artifactWrongVersion,
    });

    expect(res.verdict).toBe('WRONG_VERSION');
    expect(res.ok).toBe(false);
    expect(res.status).toBe('STALE');
    expect(res.reason).toContain('1.8.3');
  });
});
