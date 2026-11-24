import { SHOW_ANALYSIS, SHOW_CLOSURE } from "../config"
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Search, FilePlus2, Edit3, Trash2, Sparkles } from "lucide-react";
import { searchTrackwiseRecords, type TrackWiseRecord, type TrackWiseSearchMode } from "../api/trackwise";
import { deleteSavedCase, listSavedCases, renameSavedCase, type SavedCaseSummary } from "../api/workspace";

type CaseSelectProps = {
  onSelectRecord: (record: TrackWiseRecord) => void | Promise<void>;
  onStartNew: () => void | Promise<void>;
  onOpenSavedCase: (caseId: string) => void | Promise<void>;
  onOpenDemo: () => void | Promise<void>;
};


function areStringSetsEqual(left: Set<string>, right: Set<string>) {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}

export function CaseSelect({ onSelectRecord, onStartNew, onOpenSavedCase, onOpenDemo }: CaseSelectProps) {
  const [mode, setMode] = useState<TrackWiseSearchMode>("pr_id");
  const [query, setQuery] = useState("");
  const [includeClosed, setIncludeClosed] = useState(false);
  const [results, setResults] = useState<TrackWiseRecord[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCases, setSavedCases] = useState<SavedCaseSummary[]>([]);
  const [savedCasesLoading, setSavedCasesLoading] = useState(false);
  const [savedCasesError, setSavedCasesError] = useState<string | null>(null);
  const [savedCaseQuery, setSavedCaseQuery] = useState("");
  const [selectedSavedCaseIds, setSelectedSavedCaseIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteBusy, setBulkDeleteBusy] = useState(false);
  const selectAllSavedCasesRef = useRef<HTMLInputElement | null>(null);

  const visibleSavedCases = savedCases.filter((savedCase) => {
    const trimmedQuery = savedCaseQuery.trim().toLowerCase();
    if (!trimmedQuery) {
      return true;
    }

    return savedCase.case_id.toLowerCase().includes(trimmedQuery);
  });
  const visibleSavedCaseIds = visibleSavedCases.map((savedCase) => savedCase.case_id);
  const selectedSavedCases = savedCases.filter((savedCase) => selectedSavedCaseIds.has(savedCase.case_id));
  const selectedSavedCaseCount = selectedSavedCases.length;
  const visibleSelectedSavedCaseCount = visibleSavedCases.filter((savedCase) =>
    selectedSavedCaseIds.has(savedCase.case_id),
  ).length;
  const allVisibleSavedCasesSelected = visibleSavedCases.length > 0 && visibleSelectedSavedCaseCount === visibleSavedCases.length;
  const someVisibleSavedCasesSelected = visibleSelectedSavedCaseCount > 0 && !allVisibleSavedCasesSelected;


  useEffect(() => {
    let active = true;

    const loadSavedCases = async () => {
      setSavedCasesLoading(true);
      setSavedCasesError(null);

      try {
        const response = await listSavedCases();
        if (active) {
          setSavedCases(response.cases || []);
        }
      } catch (listError) {
        if (active) {
          setSavedCases([]);
          setSavedCasesError(listError instanceof Error ? listError.message : "Failed to load saved cases.");
        }
      } finally {
        if (active) {
          setSavedCasesLoading(false);
        }
      }
    };

    void loadSavedCases();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSelectedSavedCaseIds((previousSelected) => {
      if (previousSelected.size === 0) {
        return previousSelected;
      }

      const availableCaseIds = new Set(savedCases.map((savedCase) => savedCase.case_id));
      const nextSelected = new Set(
        savedCases
          .map((savedCase) => savedCase.case_id)
          .filter((caseId) => previousSelected.has(caseId) && availableCaseIds.has(caseId)),
      );

      return areStringSetsEqual(previousSelected, nextSelected) ? previousSelected : nextSelected;
    });
  }, [savedCases]);

  useEffect(() => {
    if (selectAllSavedCasesRef.current) {
      selectAllSavedCasesRef.current.indeterminate = someVisibleSavedCasesSelected;
    }
  }, [someVisibleSavedCasesSelected]);


  const runSearch = async (event?: FormEvent) => {
    event?.preventDefault();

    const trimmed = query.trim();
    // if (!trimmed || busy) {
    //   return;
    // }

    setBusy(true);
    setError(null);
    setSearched(true);

    try {
      const response = await searchTrackwiseRecords(trimmed, mode, includeClosed);
      setResults(response.records || []);
    } catch (searchError) {
      setResults([]);
      setError(searchError instanceof Error ? searchError.message : "TrackWise lookup failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleOpenRecord = async (record: TrackWiseRecord) => {
    if (busy) {
      return;
    }

    setBusy(true);
    try {
      await onSelectRecord(record);
    } finally {
      setBusy(false);
    }
  };

  const handleOpenSavedCase = async (caseId: string) => {
    if (busy) {
      return;
    }

    setBusy(true);
    try {
      await onOpenSavedCase(caseId);
    } finally {
      setBusy(false);
    }
  };

  const refreshSavedCases = async () => {
    setSavedCasesError(null);
    try {
      const response = await listSavedCases();
      setSavedCases(response.cases || []);
    } catch (listError) {
      setSavedCasesError(listError instanceof Error ? listError.message : "Failed to load saved cases.");
    }
  };

  const toggleSavedCaseSelection = (caseId: string, checked: boolean) => {
    setSelectedSavedCaseIds((previousSelected) => {
      const nextSelected = new Set(previousSelected);
      if (checked) {
        nextSelected.add(caseId);
      } else {
        nextSelected.delete(caseId);
      }
      return nextSelected;
    });
  };

  const toggleVisibleSavedCaseSelection = (checked: boolean) => {
    setSelectedSavedCaseIds((previousSelected) => {
      const nextSelected = new Set(previousSelected);
      for (const caseId of visibleSavedCaseIds) {
        if (checked) {
          nextSelected.add(caseId);
        } else {
          nextSelected.delete(caseId);
        }
      }
      return nextSelected;
    });
  };

  const handleOpenBulkDeleteDialog = () => {
    if (bulkDeleteBusy || selectedSavedCaseCount === 0) {
      return;
    }

    setSavedCasesError(null);
    setBulkDeleteOpen(true);
  };

  const handleBulkDeleteSavedCases = async () => {
    if (bulkDeleteBusy || selectedSavedCaseCount === 0) {
      return;
    }

    setBulkDeleteBusy(true);
    setSavedCasesError(null);

    let allDeletesSucceeded = true;

    try {
      for (const savedCase of selectedSavedCases) {
        await deleteSavedCase(savedCase.case_id);
      }
    } catch (deleteError) {
      allDeletesSucceeded = false;
      setSavedCasesError(deleteError instanceof Error ? deleteError.message : "Failed to delete saved cases.");
    } finally {
      await refreshSavedCases();
      if (allDeletesSucceeded) {
        setSelectedSavedCaseIds(new Set());
      }
      setBulkDeleteOpen(false);
      setBulkDeleteBusy(false);
    }
  };

  const handleRenameSavedCase = async (caseId: string) => {
    if (busy) {
      return;
    }

    const nextCaseId = window.prompt("Enter a new saved case name:", caseId)?.trim();
    if (!nextCaseId || nextCaseId === caseId) {
      return;
    }

    setBusy(true);
    try {
      await renameSavedCase(caseId, nextCaseId);
      await refreshSavedCases();
    } catch (renameError) {
      setSavedCasesError(renameError instanceof Error ? renameError.message : "Failed to rename saved case.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteSavedCase = async (caseId: string) => {
    if (busy) {
      return;
    }

    const confirmed = window.confirm(`Delete saved case ${caseId}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setBusy(true);
    try {
      await deleteSavedCase(caseId);
      await refreshSavedCases();
    } catch (deleteError) {
      setSavedCasesError(deleteError instanceof Error ? deleteError.message : "Failed to delete saved case.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-[#111118]" data-testid="trackwise-intake-screen">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-12">
        <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-sm">
          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c0172d]">AUTHOR</p>
            <h1 className="mt-2 text-3xl font-semibold">TrackWise Intake</h1>
            <p className="mt-2 text-sm text-[#6b6b7a]">
              Explore the full workflow with synthetic TrackWise records and an in-memory AUTHOR demo service.
            </p>
            <div className="mt-4 flex flex-col gap-4 rounded-xl border border-[#c0172d]/20 bg-[#fff7f8] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#111118]">Demo mode is ready</p>
                <p className="mt-1 text-xs leading-relaxed text-[#6b6b7a]">
                  Open a completed sample investigation with evidence and facts{SHOW_ANALYSIS ? ", RCA and risk" : ""}{SHOW_CLOSURE ? ", CAPA and report" : ""} content.
                </p>
              </div>
              <button
                type="button"
                data-testid="open-demo-case-button"
                disabled={busy}
                onClick={() => void onOpenDemo()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#c0172d] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#a8142a] disabled:opacity-60"
              >
                <Sparkles size={14} />
                Open sample case
              </button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
            <form onSubmit={(event) => void runSearch(event)} className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Search size={14} className="text-[#c0172d]" />
                Search TrackWise
              </div>

              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  data-testid="trackwise-mode-pr-id"
                  onClick={() => setMode("pr_id")}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    mode === "pr_id"
                      ? "bg-[#c0172d] text-white"
                      : "bg-white text-[#6b6b7a] border border-[rgba(0,0,0,0.12)] hover:text-[#111118]"
                  }`}
                >
                  PR_ID
                </button>
                <button
                  type="button"
                  data-testid="trackwise-mode-assigned-to"
                  onClick={() => setMode("assigned_to")}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    mode === "assigned_to"
                      ? "bg-[#c0172d] text-white"
                      : "bg-white text-[#6b6b7a] border border-[rgba(0,0,0,0.12)] hover:text-[#111118]"
                  }`}
                >
                  Assigned To
                </button>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6b6b7a]">
                  {mode === "pr_id" ? "PR_ID" : "Assigned To"}
                </span>
                <input
                  data-testid={mode === "pr_id" ? "trackwise-pr-id-input" : "trackwise-assigned-to-input"}
                  className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm focus:border-[#c0172d] focus:outline-none"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={mode === "pr_id" ? "Enter PR_ID" : "Enter assignee name"}
                />
              </label>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="submit"
                  data-testid="trackwise-search-button"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#c0172d] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#a8142a] disabled:cursor-not-allowed disabled:opacity-60"
                  // disabled={!query.trim() || busy}
                >
                  <Search size={14} />
                  {busy ? "Searching..." : "Search"}
                </button>

                <button
                  type="button"
                  data-testid="start-new-draft-button"
                  className="inline-flex items-center gap-2 rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-4 py-2 text-sm font-semibold text-[#111118] transition-colors hover:bg-[#f4f4f6] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={busy}
                  onClick={() => void onStartNew()}
                >
                  <FilePlus2 size={14} />
                  Start New Draft Case
                </button>
              </div>

              <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#111118]">
                <input
                  type="checkbox"
                  data-testid="trackwise-include-closed-checkbox"
                  checked={includeClosed}
                  onChange={(event) => setIncludeClosed(event.target.checked)}
                  className="h-4 w-4 rounded border-[rgba(0,0,0,0.2)] text-[#c0172d] focus:ring-[#c0172d]"
                />
                Include closed records
              </label>

              <div className="mt-3 min-h-[20px] text-xs text-[#6b6b7a]" aria-live="polite" data-testid="trackwise-search-status">
                {error ? error : searched && !busy && results.length === 0 ? "No TrackWise records found." : ""}
              </div>
            </form>

            <div className="space-y-6">
              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <FilePlus2 size={14} className="text-[#c0172d]" />
                    Results
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">
                    {results.length} found
                  </span>
                </div>

                {results.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[rgba(0,0,0,0.12)] bg-[#f9f9fb] p-5 text-sm text-[#6b6b7a]" data-testid="trackwise-empty-state">
                    Search by PR_ID or Assigned To to see matching TrackWise records.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.map((record) => (
                      <div
                        key={record.pr_id}
                        data-testid="trackwise-record-card"
                        className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#111118]">{record.pr_id}</p>
                            <p className="text-xs text-[#6b6b7a]">{record.short_description}</p>
                          </div>
                          <span className="rounded-full bg-[#fde8eb] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#c0172d]">
                            {record.current_state}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-[#6b6b7a]">
                          <div>
                            <p className="font-semibold uppercase tracking-wider">Assigned To</p>
                            <p className="text-[#111118]">{record.assigned_to}</p>
                          </div>
                          <div>
                            <p className="font-semibold uppercase tracking-wider">Site</p>
                            <p className="text-[#111118]">{record.site}</p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="text-[11px] text-[#6b6b7a]">
                            Due {record.date_due} - {record.days_remaining} days remaining
                          </p>
                          <button
                            type="button"
                            data-testid="trackwise-open-record-button"
                            className="inline-flex items-center gap-2 rounded-lg bg-[#111118] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={busy}
                            onClick={() => void handleOpenRecord(record)}
                          >
                            <ArrowRight size={14} />
                            Open / Import into Draft
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <FilePlus2 size={14} className="text-[#c0172d]" />
                    Saved Cases
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">
                    {savedCases.length} found
                  </span>
                </div>

                <div className="mb-3 rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] px-3 py-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-2 text-xs font-semibold text-[#111118]">
                      <input
                        ref={selectAllSavedCasesRef}
                        type="checkbox"
                        data-testid="saved-cases-select-all-checkbox"
                        checked={allVisibleSavedCasesSelected}
                        disabled={visibleSavedCases.length === 0 || bulkDeleteBusy}
                        onChange={(event) => toggleVisibleSavedCaseSelection(event.target.checked)}
                        className="h-4 w-4 rounded border-[rgba(0,0,0,0.2)] text-[#c0172d] focus:ring-[#c0172d]"
                      />
                      Select all visible
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">
                        {selectedSavedCaseCount} selected
                      </span>
                      <button
                        type="button"
                        data-testid="bulk-delete-saved-cases-button"
                        className="inline-flex items-center gap-2 rounded-lg border border-[rgba(192,23,45,0.18)] bg-white px-3 py-2 text-xs font-semibold text-[#c0172d] transition-colors hover:bg-[#fde8eb] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={selectedSavedCaseCount === 0 || bulkDeleteBusy}
                        onClick={handleOpenBulkDeleteDialog}
                      >
                        <Trash2 size={12} />
                        Delete selected
                      </button>
                    </div>
                  </div>
                  <label className="mt-3 flex flex-col gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">
                      Filter saved cases
                    </span>
                    <input
                      data-testid="saved-cases-filter-input"
                      className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm focus:border-[#c0172d] focus:outline-none"
                      value={savedCaseQuery}
                      onChange={(event) => setSavedCaseQuery(event.target.value)}
                      placeholder="Type a case ID to filter"
                    />
                  </label>
                </div>

                {savedCasesLoading ? (
                  <div className="rounded-lg border border-dashed border-[rgba(0,0,0,0.12)] bg-[#f9f9fb] p-5 text-sm text-[#6b6b7a]">
                    Loading saved cases...
                  </div>
                ) : savedCasesError ? (
                  <div className="rounded-lg border border-dashed border-[rgba(192,23,45,0.2)] bg-[#fde8eb] p-5 text-sm text-[#8a1c2d]">
                    {savedCasesError}
                  </div>
                ) : savedCases.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[rgba(0,0,0,0.12)] bg-[#f9f9fb] p-5 text-sm text-[#6b6b7a]">
                    No saved cases yet. Start a new draft or import a TrackWise record to create one.
                  </div>
                ) : visibleSavedCases.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[rgba(0,0,0,0.12)] bg-[#f9f9fb] p-5 text-sm text-[#6b6b7a]">
                    No saved cases match the current filter.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visibleSavedCases.map((savedCase) => (
                      <div
                        key={savedCase.case_id}
                        data-testid="saved-case-button"
                        className="w-full rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] px-3 py-3 text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              data-testid={`saved-case-checkbox-${savedCase.case_id}`}
                              checked={selectedSavedCaseIds.has(savedCase.case_id)}
                              disabled={bulkDeleteBusy}
                              onChange={(event) => toggleSavedCaseSelection(savedCase.case_id, event.target.checked)}
                              className="mt-1 h-4 w-4 rounded border-[rgba(0,0,0,0.2)] text-[#c0172d] focus:ring-[#c0172d]"
                            />
                            <div>
                              <p className="text-sm font-semibold text-[#111118]">{savedCase.case_id}</p>
                              <p className="text-[11px] text-[#6b6b7a]">
                                {savedCase.evidence_count} evidence items
                              </p>
                            </div>
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              data-testid="saved-case-rename-button"
                              className="rounded-md border border-[rgba(0,0,0,0.12)] bg-white p-1.5 text-[#6b6b7a] transition-colors hover:bg-[#f4f4f6] hover:text-[#111118] disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={busy}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleRenameSavedCase(savedCase.case_id);
                              }}
                              aria-label={`Rename ${savedCase.case_id}`}
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              type="button"
                              data-testid="saved-case-delete-button"
                              className="rounded-md border border-[rgba(0,0,0,0.12)] bg-white p-1.5 text-[#6b6b7a] transition-colors hover:bg-[#fde8eb] hover:text-[#c0172d] disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={busy}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDeleteSavedCase(savedCase.case_id);
                              }}
                              aria-label={`Delete ${savedCase.case_id}`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="text-[11px] text-[#6b6b7a]">
                            Updated {new Date(savedCase.updated_at).toLocaleString()}
                          </p>
                          <button
                            type="button"
                            data-testid="saved-case-open-button"
                            className="inline-flex items-center gap-2 rounded-lg bg-[#111118] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={busy}
                            onClick={() => void handleOpenSavedCase(savedCase.case_id)}
                          >
                            <ArrowRight size={12} />
                            Open
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-delete-saved-cases-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c0172d]">Confirm deletion</p>
            <h2 id="bulk-delete-saved-cases-title" className="mt-2 text-xl font-semibold text-[#111118]">
              Delete {selectedSavedCaseCount} saved {selectedSavedCaseCount === 1 ? "case" : "cases"}?
            </h2>
            <p className="mt-3 text-sm text-[#6b6b7a]">
              This will permanently delete the selected saved {selectedSavedCaseCount === 1 ? "case" : "cases"}.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                data-testid="bulk-delete-cancel-button"
                className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-4 py-2 text-sm font-semibold text-[#111118] transition-colors hover:bg-[#f4f4f6] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={bulkDeleteBusy}
                onClick={() => setBulkDeleteOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="bulk-delete-confirm-button"
                className="inline-flex items-center gap-2 rounded-lg bg-[#c0172d] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#a8142a] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={bulkDeleteBusy}
                onClick={() => void handleBulkDeleteSavedCases()}
              >
                <Trash2 size={14} />
                {bulkDeleteBusy ? "Deleting..." : "Delete selected"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
