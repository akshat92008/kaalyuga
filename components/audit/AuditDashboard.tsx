'use client';

import React, { useState, useMemo } from 'react';
import {
  OVERALL_AUDIT_SUMMARY,
  CATEGORY_RATINGS,
  AUDIT_FINDINGS,
  CRITICAL_IMPROVEMENTS,
  AuditCategory,
  AuditSeverity,
  filterAuditFindings,
  computeSeverityCounts,
} from '@/lib/audit/auditData';
import WukongArena from '@/components/game/WukongArena';
import {
  ShieldAlert,
  Bug,
  Zap,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileCode2,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from 'lucide-react';

export default function AuditDashboard() {
  const [activeView, setActiveView] = useState<'overview' | 'findings' | 'roadmap' | 'sandbox'>('overview');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AuditCategory>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | AuditSeverity>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFindingIds, setExpandedFindingIds] = useState<Record<string, boolean>>({
    'BUG-01': true,
    'BUG-02': true,
    'OPT-01': true,
  });

  const severityCounts = useMemo(() => computeSeverityCounts(AUDIT_FINDINGS), []);
  const filteredFindings = useMemo(
    () =>
      filterAuditFindings(AUDIT_FINDINGS, {
        category: categoryFilter,
        severity: severityFilter,
        searchQuery,
      }),
    [categoryFilter, severityFilter, searchQuery]
  );

  const toggleFinding = (id: string) => {
    setExpandedFindingIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (activeView === 'sandbox') {
    return (
      <div className="relative w-screen h-screen overflow-hidden bg-[#090807]">
        <WukongArena />
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
          <button
            type="button"
            onClick={() => setActiveView('overview')}
            className="flex items-center gap-2 px-4 py-2 bg-[#11151C]/95 hover:bg-[#1A202C] text-[#F1F5F9] border border-[#D4A548]/60 text-xs font-semibold tracking-wide transition-colors cursor-pointer whitespace-nowrap shadow-lg"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#D4A548]" />
            <span>Return to Code Audit Report</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D11] text-[#F1F5F9] flex flex-col">
      {/* Top Bar Contract: 3 Zones (Brand, Nav Links, Primary CTA) */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 lg:px-10 py-4 bg-[#0B0D11]/95 border-b border-slate-800/90">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('overview');
          }}
          className="font-display text-lg font-bold tracking-wider text-[#F8FAFC] whitespace-nowrap shrink-0"
        >
          WUKONG MASTER AUDIT
        </a>

        <nav aria-label="Audit Sections" className="flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            type="button"
            onClick={() => setActiveView('overview')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'overview'
                ? 'text-[#F8FAFC] border-b-2 border-[#D4A548]'
                : 'hover:text-slate-200'
            }`}
          >
            Executive Scorecard
          </button>
          <button
            type="button"
            onClick={() => setActiveView('findings')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'findings'
                ? 'text-[#F8FAFC] border-b-2 border-[#D4A548]'
                : 'hover:text-slate-200'
            }`}
          >
            Detailed Findings ({AUDIT_FINDINGS.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveView('roadmap')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'roadmap'
                ? 'text-[#F8FAFC] border-b-2 border-[#D4A548]'
                : 'hover:text-slate-200'
            }`}
          >
            Critical Improvements ({CRITICAL_IMPROVEMENTS.length})
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveView('sandbox')}
            className="flex items-center gap-2 px-4 py-2 bg-[#D4A548] hover:bg-[#E4B85C] text-[#090807] text-xs font-bold tracking-wider uppercase rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch Patched Game Sandbox</span>
          </button>
        </div>
      </header>

      {/* Main Content Container (1440px Desktop Baseline) */}
      <main id="top" className="flex-1 w-full max-w-[1360px] mx-auto px-6 lg:px-10 py-8 space-y-10">
        {/* Hero Verdict Banner */}
        <section className="p-6 lg:p-8 bg-[#11151C] border border-slate-800 rounded-lg space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-3 max-w-4xl">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono-num">
                <span>Archive: {OVERALL_AUDIT_SUMMARY.archiveFile}</span>
                <span aria-hidden="true">·</span>
                <span>{OVERALL_AUDIT_SUMMARY.archiveSizeMb} MB Uncompressed</span>
                <span aria-hidden="true">·</span>
                <span>{OVERALL_AUDIT_SUMMARY.sourceFilesAudited} Source Modules</span>
                <span aria-hidden="true">·</span>
                <span>{OVERALL_AUDIT_SUMMARY.totalLinesOfCode.toLocaleString()} LOC Inspected</span>
              </div>

              <h1 className="font-display text-2xl lg:text-3xl font-bold text-[#F8FAFC] leading-tight">
                {OVERALL_AUDIT_SUMMARY.verdictTitle}
              </h1>

              <p className="text-sm lg:text-base text-slate-300 leading-relaxed">
                {OVERALL_AUDIT_SUMMARY.executiveVerdict}
              </p>
            </div>

            {/* Aggregate Score Card */}
            <div className="flex sm:flex-row lg:flex-col justify-between gap-4 p-5 bg-[#0B0D11] border border-slate-800/90 rounded min-w-[240px] shrink-0">
              <div>
                <div className="text-xs text-slate-400">Initial Audit Score</div>
                <div className="text-2xl font-bold font-mono-num text-amber-400 mt-0.5">
                  {OVERALL_AUDIT_SUMMARY.overallScoreBefore.toFixed(1)}{' '}
                  <span className="text-sm font-normal text-slate-500">/ 10.0</span>
                </div>
              </div>
              <div className="h-px bg-slate-800 hidden lg:block" />
              <div>
                <div className="text-xs text-slate-400">Post-Patch Sandbox Score</div>
                <div className="text-2xl font-bold font-mono-num text-emerald-400 mt-0.5">
                  {OVERALL_AUDIT_SUMMARY.overallScoreAfter.toFixed(1)}{' '}
                  <span className="text-sm font-normal text-slate-500">/ 10.0</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Column KPI Strip Below Hero */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80">
            <div className="p-4 bg-[#0B0D11] border border-slate-800/70 rounded">
              <div className="text-xs text-slate-400">Critical Findings (P0)</div>
              <div className="text-2xl font-bold font-mono-num text-rose-400 mt-1">
                {severityCounts.Critical}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Dash timer bug · 471MB bloat · 80-canvas BFS
              </div>
            </div>

            <div className="p-4 bg-[#0B0D11] border border-slate-800/70 rounded">
              <div className="text-xs text-slate-400">High Severity Findings (P1)</div>
              <div className="text-2xl font-bold font-mono-num text-amber-400 mt-1">
                {severityCounts.High}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Posture bypass · Modal pause · Debug API · 120Hz state
              </div>
            </div>

            <div className="p-4 bg-[#0B0D11] border border-slate-800/70 rounded">
              <div className="text-xs text-slate-400">Medium Severity Findings (P2)</div>
              <div className="text-2xl font-bold font-mono-num text-sky-400 mt-1">
                {severityCounts.Medium}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                0-Orb clamp · Audio unmute · Sprite cache · Zoom aim
              </div>
            </div>

            <div className="p-4 bg-[#0B0D11] border border-slate-800/70 rounded">
              <div className="text-xs text-slate-400">Sandbox Patch Verification</div>
              <div className="text-2xl font-bold font-mono-num text-emerald-400 mt-1">
                6 / 6
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Runtime code patches applied &amp; unit-tested
              </div>
            </div>
          </div>
        </section>

        {/* VIEW 1: EXECUTIVE SCORECARD & CATEGORY RATINGS */}
        {activeView === 'overview' && (
          <div className="space-y-10">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#F8FAFC]">
                    01. Category Ratings &amp; Technical Verdict
                  </h2>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Detailed evaluation across Bug Resilience, Security Posture, Performance Optimization, and Code Architecture.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('findings')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Inspect All {AUDIT_FINDINGS.length} Findings
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {CATEGORY_RATINGS.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-6 bg-[#11151C] border border-slate-800 rounded-lg flex flex-col justify-between space-y-5"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs text-slate-400">
                            {cat.verdictBadge}
                          </div>
                          <h3 className="text-lg font-semibold text-[#F8FAFC] mt-0.5">
                            {cat.title}
                          </h3>
                        </div>
                        <div className="text-right font-mono-num shrink-0">
                          <div className="text-xs text-slate-400">Initial → Patched</div>
                          <div className="text-lg font-bold">
                            <span className="text-amber-400">{cat.scoreBefore.toFixed(1)}</span>
                            <span className="text-slate-500 mx-1">→</span>
                            <span className="text-emerald-400">{cat.scoreAfter.toFixed(1)}</span>
                            <span className="text-xs text-slate-500"> / {cat.maxScore}</span>
                          </div>
                        </div>
                      </div>

                      {/* Score Bar */}
                      <div className="w-full h-2 bg-slate-900 rounded overflow-hidden flex">
                        <div
                          className="h-full bg-amber-500/80"
                          style={{ width: `${(cat.scoreBefore / cat.maxScore) * 100}%` }}
                        />
                        <div
                          className="h-full bg-emerald-500/80"
                          style={{
                            width: `${((cat.scoreAfter - cat.scoreBefore) / cat.maxScore) * 100}%`,
                          }}
                        />
                      </div>

                      <p className="text-sm text-slate-300 leading-relaxed">{cat.summary}</p>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-800/80 text-xs">
                      <div>
                        <div className="font-semibold text-emerald-400 mb-1.5">
                          What Works Well:
                        </div>
                        <ul className="space-y-1 text-slate-300 list-disc pl-4">
                          {cat.keyStrengths.map((str, i) => (
                            <li key={i}>{str}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div className="font-semibold text-rose-400 mb-1.5">
                          Key Vulnerabilities &amp; Bottlenecks Identified:
                        </div>
                        <ul className="space-y-1 text-slate-300 list-disc pl-4">
                          {cat.primaryRisks.map((risk, i) => (
                            <li key={i}>{risk}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryFilter(cat.id);
                            setActiveView('findings');
                          }}
                          className="text-xs font-semibold text-[#D4A548] hover:underline cursor-pointer"
                        >
                          Filter {cat.title} Findings →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Quick Preview of Critical Remediation Table */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#F8FAFC]">
                    02. Summary of Critical Improvements Required
                  </h2>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Prioritized engineering roadmap ordered by severity (P0 Blockers → P1 High → P2 Structural).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('roadmap')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Open Full Remediation Plan
                </button>
              </div>

              <div className="overflow-x-auto bg-[#11151C] border border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-400 bg-[#0B0D11]/60">
                      <th className="py-3 px-4 font-medium">Priority &amp; ID</th>
                      <th className="py-3 px-4 font-medium">Improvement Required</th>
                      <th className="py-3 px-4 font-medium">Target Module</th>
                      <th className="py-3 px-4 font-medium">Expected Impact</th>
                      <th className="py-3 px-4 font-medium text-right">Sandbox Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {CRITICAL_IMPROVEMENTS.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono-num text-xs whitespace-nowrap">
                          <span
                            className={
                              item.priority.startsWith('P0')
                                ? 'text-rose-400 font-semibold'
                                : item.priority.startsWith('P1')
                                ? 'text-amber-400 font-semibold'
                                : 'text-sky-400 font-semibold'
                            }
                          >
                            {item.priority.split(' ')[0]}
                          </span>
                          <span className="text-slate-500 mx-1.5">·</span>
                          <span className="text-slate-300">{item.id}</span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#F8FAFC]">
                          {item.title}
                        </td>
                        <td className="py-3.5 px-4 font-mono-num text-xs text-slate-400">
                          {item.targetFiles}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-300">
                          {item.expectedOutcome}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-num text-xs whitespace-nowrap">
                          {item.patchedInWorkspace ? (
                            <span className="text-emerald-400 font-medium">Patched &amp; Verified</span>
                          ) : (
                            <span className="text-amber-400 font-medium">Asset Build Step</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* VIEW 2: DETAILED FINDINGS & DIFF INSPECTOR */}
        {activeView === 'findings' && (
          <section className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-[#11151C] border border-slate-800 rounded-lg">
              {/* Category Segmented Filter */}
              <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0B0D11] border border-slate-800 rounded">
                {(
                  [
                    { id: 'all', label: `All (${AUDIT_FINDINGS.length})` },
                    { id: 'bugs', label: 'Bugs (5)' },
                    { id: 'security', label: 'Security (2)' },
                    { id: 'optimization', label: 'Optimization (3)' },
                    { id: 'architecture', label: 'Architecture (1)' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCategoryFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      categoryFilter === tab.id
                        ? 'bg-[#D4A548] text-[#090807] font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Severity Filter + Search Input */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 p-1 bg-[#0B0D11] border border-slate-800 rounded">
                  {(['all', 'Critical', 'High', 'Medium'] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverityFilter(sev)}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        severityFilter === sev
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {sev === 'all' ? 'All Severities' : sev}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    aria-label="Search findings by keyword or file"
                    placeholder="Search file, bug ID, function..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-[#0B0D11] border border-slate-800 rounded text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#D4A548]"
                  />
                </div>
              </div>
            </div>

            {filteredFindings.length === 0 ? (
              <div className="p-12 bg-[#11151C] border border-slate-800 rounded-lg text-center space-y-3">
                <p className="text-sm text-slate-300">
                  No audit findings match your active filter criteria.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter('all');
                    setSeverityFilter('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 bg-[#D4A548] text-[#090807] text-xs font-bold rounded cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFindings.map((finding) => {
                  const isExpanded = !!expandedFindingIds[finding.id];
                  return (
                    <div
                      key={finding.id}
                      className="bg-[#11151C] border border-slate-800 rounded-lg overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleFinding(finding.id)}
                        className="w-full p-5 text-left flex items-start justify-between gap-4 hover:bg-slate-800/25 transition-colors cursor-pointer"
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-mono-num">
                            <span
                              className={
                                finding.severity === 'Critical'
                                  ? 'text-rose-400 font-bold'
                                  : finding.severity === 'High'
                                  ? 'text-amber-400 font-bold'
                                  : 'text-sky-400 font-semibold'
                              }
                            >
                              [{finding.severity.toUpperCase()}]
                            </span>
                            <span className="text-slate-300 font-semibold">{finding.id}</span>
                            <span aria-hidden="true" className="text-slate-600">·</span>
                            <span className="text-slate-400">{finding.file}</span>
                            <span aria-hidden="true" className="text-slate-600">·</span>
                            <span className="text-slate-400">{finding.lines}</span>
                            <span aria-hidden="true" className="text-slate-600">·</span>
                            <span className="text-emerald-400">{finding.status}</span>
                          </div>

                          <h3 className="text-base font-semibold text-[#F8FAFC]">
                            {finding.title}
                          </h3>

                          <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
                            {finding.impactSummary}
                          </p>
                        </div>

                        <div className="text-slate-400 shrink-0 pt-1">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-5 pt-3 border-t border-slate-800/80 space-y-4 bg-[#0B0D11]/50">
                          <div className="text-xs text-slate-300 leading-relaxed">
                            <strong className="text-slate-100">Technical Root Cause: </strong>
                            {finding.rootCause}
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <div className="text-xs font-mono-num text-rose-400">
                                Original Vulnerable / Unoptimized Code
                              </div>
                              <pre className="p-3.5 bg-[#090B0E] border border-rose-950/60 rounded text-xs font-mono-num text-slate-300 overflow-x-auto leading-relaxed">
                                <code>{finding.vulnerableOrBuggyCode}</code>
                              </pre>
                            </div>

                            <div className="space-y-1.5">
                              <div className="text-xs font-mono-num text-emerald-400">
                                Remediated Production Code
                              </div>
                              <pre className="p-3.5 bg-[#090B0E] border border-emerald-950/60 rounded text-xs font-mono-num text-slate-200 overflow-x-auto leading-relaxed">
                                <code>{finding.remediatedCode}</code>
                              </pre>
                            </div>
                          </div>

                          <div className="text-xs text-emerald-400 font-mono-num">
                            Verified Outcome: {finding.measurableGain}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* VIEW 3: CRITICAL IMPROVEMENTS ROADMAP */}
        {activeView === 'roadmap' && (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-[#F8FAFC]">
                Critical Remediation Roadmap &amp; Engineering Action Plan
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Concrete step-by-step improvements required to bring Black Myth: Wukong — Ashen Mandate to production grade.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {CRITICAL_IMPROVEMENTS.map((item) => (
                <div
                  key={item.id}
                  className="p-6 bg-[#11151C] border border-slate-800 rounded-lg space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-mono-num">
                      <span
                        className={
                          item.priority.startsWith('P0')
                            ? 'text-rose-400 font-bold'
                            : item.priority.startsWith('P1')
                            ? 'text-amber-400 font-bold'
                            : 'text-sky-400 font-semibold'
                        }
                      >
                        {item.priority}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-slate-300 font-semibold">{item.id}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-slate-400">{item.targetFiles}</span>
                    </div>

                    <div className="text-xs font-mono-num">
                      {item.patchedInWorkspace ? (
                        <span className="text-emerald-400 font-semibold">
                          ✓ Patched in Live Sandbox
                        </span>
                      ) : (
                        <span className="text-amber-400 font-semibold">
                          Build Pipeline Action Required
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-[#F8FAFC]">{item.title}</h3>

                  <p className="text-sm text-slate-300 leading-relaxed">
                    <strong className="text-slate-100">Action Required: </strong>
                    {item.actionRequired}
                  </p>

                  <p className="text-xs font-mono-num text-emerald-400">
                    Impact: {item.expectedOutcome}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
