
/**
 * 파일명: hooks/useWebViewBack.js
 * 설명: WebView 뒤로가기(NAV_STATE) 테스트를 위한 상태/전송 관리 훅.
 *       편집→실행중→결과의 단계 전환과 함께 NAV_STATE를 App으로 통보하고,
 *       수동 오버라이드 플래그를 통해 isRoot/canGoBackInWeb/hasBlockingUI/needsConfirm을 제어한다.
 *
 * 주요 기능:
 * - 모달 열림/닫힘 상태 관리: { isOpen, open(), close() }
 * - 단계 전환: phase = "modal" | "running" | "result"
 * - 폼 상태/검증:
 *   · title(설명), mode(detail|home|modal|form), hint(페이지 이름), count(데모용)
 *   · useManualFlags on 시 m_isRoot/m_canGoBackInWeb/m_hasBlockingUI/m_needsConfirm 직접 지정
 * - NAV_STATE 전송:
 *   · sendNav(hint, hasBlockingUI, needsConfirm, { isRootOverride?, canGoBackOverride? })
 *   · open() 시 MODAL 힌트, close() 시 ENTRY 힌트, submit() 시 사용자 hint,
 *     완료 후 RESULT 힌트 전송(패널은 열린 상태 유지)
 *
 * 사용 맥락:
 * - RN WebView 기반 앱에서 안드로이드 하드웨어 뒤로가기를 검증
 *   · 웹은 라우트/모달 상태 변경마다 NAV_STATE 통지
 *   · 앱은 하드웨어 뒤로가기 시 BACK_REQUEST로 마지막 NAV_STATE를 웹에 패스스루
 *   · 웹은 BACK_REQUEST 수신 시 모달 닫기/confirm/back 등 자체 처리
 *
 * 연관 메시지 타입:
 * - Web → App: NAV_STATE
 * - App → Web: BACK_REQUEST (앱 하드웨어 뒤로가기 발생 시 전달)
 *
 * 비고:
 * - hint는 자동이 아닌 사용자 입력(테스트 유연성 확보)
 * - 카테고리(mode)는 기본 플래그 계산용이고, 수동 오버라이드가 켜지면 해당 플래그가 우선
 * - running 타이머(1.5s)는 데모용; 실제 시나리오에 맞게 조절하거나 제거 가능
 */


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notifyNavState } from "../bridges/appBridge";

export const HINTS = {
  ENTRY: "webview_back_entry",
  MODAL: "webview_back_modal",
  RUNNING: "webview_back_running",
  RESULT: "webview_back_result",
};

export default function useWebViewBack({ isRoot = false } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState("modal");
  const [form, setForm] = useState({
    title: "",
    mode: "detail",   // detail | home | modal | form
    hint: "detail",    // 자유 입력
    count: 1,
    // 수동 오버라이드 플래그
    useManualFlags: false,
    m_isRoot: false,
    m_canGoBackInWeb: false,
    m_hasBlockingUI: false,
    m_needsConfirm: false,
  });
  const [errors, setErrors] = useState({});
  const runningTimerRef = useRef(null);

  const canGoBackInWebAuto = useMemo(() => {
    try { return window.history.length > 1; } catch { return false; }
  }, []);

  // 공통 NAV_STATE 송신 (context 포함 + isRoot override 지원)
  const sendNav = useCallback((hint, hasBlockingUI, needsConfirm, { isRootOverride, canGoBackOverride } = {}) => {
    const isRootToSend = typeof isRootOverride === "boolean" ? isRootOverride : isRoot;
    const canGoBackToSend = typeof canGoBackOverride === "boolean" ? canGoBackOverride : canGoBackInWebAuto;

    notifyNavState({
      isRoot: isRootToSend,
      canGoBackInWeb: canGoBackToSend,
      hasBlockingUI,
      needsConfirm,
      hint,
      context: {
        title: (form.title || "").trim(),
        scenario: form.mode,
        hint: (form.hint || "").trim(),
        count: Number(form.count) || 0,
        at: Date.now(),
        manual: !!form.useManualFlags,
      },
    });
  }, [isRoot, canGoBackInWebAuto, form.title, form.mode, form.hint, form.count, form.useManualFlags]);

  const open = useCallback(() => {
    setIsOpen(true);
    setPhase("modal");
    setErrors({});

    // 패널 열림 상태 NAV_STATE (차단 true, 확인 false)
    // 수동 모드여도 여기서는 기본 힌트를 보냄
    sendNav(HINTS.MODAL, true, false);
  }, [sendNav]);

  const close = useCallback(() => {
    setIsOpen(false);
    setPhase("modal");
    sendNav(HINTS.ENTRY, false, false);
  }, [sendNav]);

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // 검증
  useEffect(() => {
    const nextErrors = {};
    if (!form.title?.trim()) nextErrors.title = "제목을 입력해주세요";
    if (!form.mode) nextErrors.mode = "카테고리를 선택하세요";
    if (!form.hint?.trim()) nextErrors.hint = "hint(페이지 이름)를 입력하세요";
    if (!Number(form.count) || Number(form.count) < 1) nextErrors.count = "1 이상의 숫자를 입력";
    setErrors(nextErrors);
  }, [form]);

  // 실행 / 중단
  const submit = useCallback(() => {
    if (Object.keys(errors).length > 0) return;

    // 기본 정책(카테고리 기준)
    let base_isRoot = form.mode === "home";
    let base_hasBlockingUI = form.mode === "modal";
    let base_needsConfirm = form.mode === "form";

    // 수동 오버라이드
    const useManual = !!form.useManualFlags;
    const isRootOverride = useManual ? !!form.m_isRoot : base_isRoot;
    const hasBlockingUI = useManual ? !!form.m_hasBlockingUI : base_hasBlockingUI;
    const needsConfirm = useManual ? !!form.m_needsConfirm : base_needsConfirm;
    const canGoBackOverride = useManual ? !!form.m_canGoBackInWeb : undefined; // undefined → 자동

    const hintToSend = (form.hint || "detail").trim();

    setPhase("running");
    sendNav(hintToSend, hasBlockingUI, needsConfirm, { isRootOverride, canGoBackOverride });

    // 데모: 완료 후 result 힌트 표시 (패널 열림 유지)
    runningTimerRef.current = setTimeout(() => {
      setPhase("result");
      sendNav(HINTS.RESULT, true, false, { isRootOverride, canGoBackOverride });
    }, 1500);
  }, [errors, form.mode, form.hint, form.useManualFlags, form.m_isRoot, form.m_hasBlockingUI, form.m_needsConfirm, form.m_canGoBackInWeb, sendNav]);

  const abort = useCallback(() => {
    if (runningTimerRef.current) {
      clearTimeout(runningTimerRef.current);
      runningTimerRef.current = null;
    }
    setPhase("modal");

    // 수동 모드면 현재 토글 상태 반영해서 NAV_STATE 알림
    const isRootOverride = form.useManualFlags ? !!form.m_isRoot : form.mode === "home";
    const canGoBackOverride = form.useManualFlags ? !!form.m_canGoBackInWeb : undefined;

    sendNav(HINTS.MODAL, true, false, { isRootOverride, canGoBackOverride });
  }, [sendNav, form.useManualFlags, form.m_isRoot, form.m_canGoBackInWeb, form.mode]);

  // 정리
  useEffect(() => () => {
    if (runningTimerRef.current) clearTimeout(runningTimerRef.current);
  }, []);

  return {
    isOpen,
    phase,
    form,
    errors,
    open,
    close,
    submit,
    abort,
    setField,
  };
}

