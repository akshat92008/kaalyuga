import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUDIT_FINDINGS,
  CATEGORY_RATINGS,
  CRITICAL_IMPROVEMENTS,
  filterAuditFindings,
  computeSeverityCounts,
} from './auditData';

test('CATEGORY_RATINGS covers all 4 core audit dimensions with valid scores', () => {
  assert.equal(CATEGORY_RATINGS.length, 4);
  for (const r of CATEGORY_RATINGS) {
    assert.ok(r.scoreBefore >= 0 && r.scoreBefore <= r.maxScore);
    assert.ok(r.scoreAfter >= r.scoreBefore && r.scoreAfter <= r.maxScore);
  }
});

test('filterAuditFindings filters accurately by category, severity, and search query', () => {
  const bugsOnly = filterAuditFindings(AUDIT_FINDINGS, { category: 'bugs' });
  assert.ok(bugsOnly.length >= 5);
  assert.ok(bugsOnly.every((f) => f.category === 'bugs'));

  const criticalOnly = filterAuditFindings(AUDIT_FINDINGS, { severity: 'Critical' });
  assert.equal(criticalOnly.length, 3);

  const searchDash = filterAuditFindings(AUDIT_FINDINGS, { searchQuery: 'dashRechargeTimer' });
  assert.equal(searchDash.length, 1);
  assert.equal(searchDash[0].id, 'BUG-01');
});

test('computeSeverityCounts tallies Critical, High, Medium, and Low findings', () => {
  const counts = computeSeverityCounts(AUDIT_FINDINGS);
  assert.equal(counts.Critical, 3);
  assert.equal(counts.High, 5);
  assert.equal(counts.Medium, 3);
  assert.equal(CRITICAL_IMPROVEMENTS.length, 6);
});
