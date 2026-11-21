import {ProgressiveReviewError} from "../services/progressive"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { matchService } from "../services/matchService"
import type { DetailState, IndexInfo, IndexState, MatchRow, RecordDetail, SearchInput, SearchResult, SearchState } from "../types"
import { validQuery } from "../searchModel"

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

export function useMatchSearch() {
  const [searchState, setSearchState] = useState<SearchState>("idle")
  const [searchError, setSearchError] = useState("")
  const [result, setResult] = useState<SearchResult | null>(null)
  const [submitted, setSubmitted] = useState<SearchInput | null>(null)
  const [selectedId, setSelectedId] = useState("")
  const [selectedRow,setSelectedRow]=useState<MatchRow|null>(null)
  const [reviewError,setReviewError]=useState("")
  const [detailState, setDetailState] = useState<DetailState>("idle")
  const [detailError, setDetailError] = useState("")
  const [recordDetail, setRecordDetail] = useState<RecordDetail | null>(null)
  const [indexState, setIndexState] = useState<IndexState>("loading")
  const [indexInfo, setIndexInfo] = useState<IndexInfo | null>(null)
  const searchRequest = useRef<AbortController | null>(null)
  const detailRequest = useRef<AbortController | null>(null)
  const selected = useMemo(() => result?.rows.find(row => row.deviationId === selectedId) ?? (selectedRow?.deviationId===selectedId?selectedRow:undefined), [result, selectedId, selectedRow])

  useEffect(() => {
    const controller = new AbortController()
    matchService.getIndexInfo(controller.signal).then(info => {
      if (!controller.signal.aborted) { setIndexInfo(info); setIndexState("success") }
    }).catch(() => { if (!controller.signal.aborted) setIndexState("error") })
    return () => controller.abort()
  }, [])
  useEffect(() => () => { searchRequest.current?.abort(); detailRequest.current?.abort() }, [])
  useEffect(() => {
    if (indexInfo?.semanticState !== "warming") return
    const controller = new AbortController()
    const timer = window.setInterval(() => {
      matchService.getIndexInfo(controller.signal).then(info => {
        if (!controller.signal.aborted) setIndexInfo(info)
      }).catch(() => {})
    }, 3000)
    return () => { window.clearInterval(timer); controller.abort() }
  }, [indexInfo])

  const loadRecord = useCallback(async (row: MatchRow) => {
    detailRequest.current?.abort()
    const controller = new AbortController()
    detailRequest.current = controller
    setRecordDetail(null)
    setDetailError("")
    setDetailState("loading")
    try {
      const detail = await matchService.getRecord(row, controller.signal)
      if (controller.signal.aborted) return
      setRecordDetail(detail)
      setDetailState("success")
    } catch (error) {
      if (controller.signal.aborted) return
      setDetailError(messageOf(error, "The record details could not be loaded."))
      setDetailState("error")
    }
  }, [])

  const search = useCallback(async (input: SearchInput) => {
    const text = input.query.trim()
    if (!validQuery(text)) return
    const request = structuredClone({ ...input, query: text })
    searchRequest.current?.abort()
    detailRequest.current?.abort()
    const controller = new AbortController()
    searchRequest.current = controller
    setSearchState("loading")
    setSearchError("")
    setResult(null)
    setSelectedId("");setSelectedRow(null);setReviewError("")
    setDetailState("idle")
    setDetailError("")
    setRecordDetail(null)
    setSubmitted(request)
    try {
      const result = await matchService.search(request, controller.signal, indexInfo?.progressiveSearch ? initial=>{
        if(controller.signal.aborted)return
        setResult(initial);setSearchState(initial.rows.length?"success":"empty")
      }:undefined)
      if (controller.signal.aborted) return
      setResult(result)
      setSearchState(result.rows.length ? "success" : "empty")
    } catch (error) {
      if (controller.signal.aborted) return
      if(error instanceof ProgressiveReviewError){
        setResult({...error.initial,reviewState:"unavailable",summaryId:null});setReviewError(error.message)
        setSearchState(error.initial.rows.length?"success":"empty");return
      }
      setResult(null);setSelectedId("");setSelectedRow(null);detailRequest.current?.abort();setRecordDetail(null);setDetailState("idle")
      setSearchError(messageOf(error, "The search request could not be completed."))
      setSearchState("error")
    }
  }, [indexInfo?.progressiveSearch])
  const select = useCallback((row: MatchRow) => { setSelectedId(row.deviationId);setSelectedRow(row); return loadRecord(row) }, [loadRecord])
  const retryDetail = useCallback(() => { if (selected) void loadRecord(selected) }, [selected, loadRecord])
  const cancel = useCallback(() => { searchRequest.current?.abort(); setSearchState("idle"); setSearchError("") }, [])
  return { searchState, searchError, reviewError, result, submitted, selected, selectedId, detailState, detailError, recordDetail, indexState, indexInfo, search, select, retryDetail, cancel }
}
