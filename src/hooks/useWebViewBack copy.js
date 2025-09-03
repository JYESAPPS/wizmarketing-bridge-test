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
    mode: "detail",       // detail | home | modal | form
    hint: "detail",
    count: 1,
    useManualFlags: false,
    m_isRoot: false,
    m_canGoBackInWeb: false,
    m_hasBlockingUI: false,
    m_needsConfirm: false,
  });
  const [errors, setErrors] = useState({});
  const runningTimerRef = useRef(null);

  // ✅ 베이스 라우트 isRoot를 별도 ref로 고정(프롭 변경 시 갱신)
  const baseIsRootRef = useRef(!!isRoot);
  useEffect(() => { baseIsRootRef.current = !!isRoot; }, [isRoot]);

  const canGoBackInWebAuto = useMemo(() => {
    try { return window.history.length > 1; } catch { return false; }
  }, []);

  // ✅ isRoot는 항상 베이스 라우트 기준으로 전송 (override 명시한 경우만 예외)
  const sendNav = useCallback(
    (hint, hasBlockingUI, needsConfirm, { isRootOverride, canGoBackOverride } = {}) => {
      const isRootToSend =
        typeof isRootOverride === "boolean" ? isRootOverride : baseIsRootRef.current;
      const canGoBackToSend =
        typeof canGoBackOverride === "boolean" ? canGoBackOverride : canGoBackInWebAuto;

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
    },
    [canGoBackInWebAuto, form.title, form.mode, form.hint, form.count, form.useManualFlags]
  );

  const open = useCallback(() => {
    setIsOpen(true);
    setPhase("modal");
    setErrors({});
    // ✅ 모달 열림: hasBlockingUI만 true
    sendNav(HINTS.MODAL, true, false);
  }, [sendNav]);

  const close = useCallback(() => {
    setIsOpen(false);
    setPhase("modal");
    // ✅ 모달 닫힘: hasBlockingUI false (isRoot는 베이스 유지)
    sendNav(HINTS.ENTRY, false, false);
  }, [sendNav]);

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // 폼 검증
  useEffect(() => {
    const next = {};
    if (!form.title?.trim()) next.title = "제목을 입력해주세요";
    if (!form.mode) next.mode = "카테고리를 선택하세요";
    if (!form.hint?.trim()) next.hint = "hint(페이지 이름)를 입력하세요";
    if (!Number(form.count) || Number(form.count) < 1) next.count = "1 이상의 숫자를 입력";
    setErrors(next);
  }, [form]);

  const submit = useCallback(() => {
    if (Object.keys(errors).length > 0) return;

    // ✅ 기본 정책: isRoot는 절대 건드리지 않음(베이스 유지)
    const hasBlockingUI = form.useManualFlags ? !!form.m_hasBlockingUI : form.mode === "modal";
    const needsConfirm = form.useManualFlags ? !!form.m_needsConfirm : form.mode === "form";
    const canGoBackOverride = form.useManualFlags ? !!form.m_canGoBackInWeb : undefined;

    const hintToSend = (form.hint || "detail").trim();

    setPhase("running");
    sendNav(hintToSend, hasBlockingUI, needsConfirm, { canGoBackOverride });

    runningTimerRef.current = setTimeout(() => {
      setPhase("result");
      // ✅ result 단계도 isRoot 유지
      sendNav(HINTS.RESULT, true, false, { canGoBackOverride });
    }, 1500);
  }, [errors, form, sendNav]);

  const abort = useCallback(() => {
    if (runningTimerRef.current) {
      clearTimeout(runningTimerRef.current);
      runningTimerRef.current = null;
    }
    setPhase("modal");

    const canGoBackOverride = form.useManualFlags ? !!form.m_canGoBackInWeb : undefined;
    // ✅ 중단 시에도 모달 상태로 복원(베이스 isRoot 유지)
    sendNav(HINTS.MODAL, true, false, { canGoBackOverride });
  }, [sendNav, form.useManualFlags, form.m_canGoBackInWeb]);

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
