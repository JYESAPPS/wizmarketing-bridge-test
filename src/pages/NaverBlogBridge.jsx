// /src/pages/auth/naver/NaverBlogBridge.jsx
import { useEffect, useMemo, useRef, useState } from 'react';

// 🔧 교체: Functions 엔드포인트
const EXCHANGE_URL = 'https://asia-northeast1-wizad-b69ee.cloudfunctions.net/naverExchange';
                  
const BLOG_POST_URL = 'https://asia-northeast1-wizad-b69ee.cloudfunctions.net/naverBlogPost';

const REDIRECT_URI = 'https://wizad-b69ee.web.app/auth/naver/cb2/'; 

// 🔧 교체: 네이버 클라이언트 ID (노출 문제 없도록 운영에선 서버로 옮기는 걸 권장)
// 데모/테스트 단계에선 문제 없지만, 최종은 authorize URL만 쓰이므로 괜찮음.
const NAVER_CLIENT_ID = 'YSd2iMy0gj8Da9MZ4Unf';

// 현재 페이지의 콜백 절대경로 (네이버 콘솔 등록값과 100% 동일해야 함)
function useRedirectUri() {
    const href = typeof window !== 'undefined' ? window.location.href : '';
    // 쿼리/해시는 제거, path 끝이 /cb2/ 로 끝나게
    const u = new URL(href);
    return `${u.origin}/auth/naver/cb2/`;
}

export default function NaverBlogBridge() {
    const redirectUri = useRedirectUri();
    const [msg, setMsg] = useState('네이버와 통신 중…');

    const params = useMemo(() => {
        if (typeof window === 'undefined') return new URLSearchParams();
        return new URLSearchParams(window.location.search);
    }, []);

    const onceRef = useRef(false);
    useEffect(() => {
        if (onceRef.current) return;
        onceRef.current = true;

        (async () => {
            try {
                const code = params.get('code');
                const state = params.get('state') || '';

                // 0) 메인(모달)에서 저장해둔 초안/상태
                const draftRaw = sessionStorage.getItem('naver_draft') || '{}';
                let draft = {};
                try {
                    draft = JSON.parse(draftRaw);
                } catch (err) {
                    console.warn('[NAVER][DRAFT parse_error]', err, draftRaw);
                }
                const savedState = sessionStorage.getItem('naver_state') || '';

                console.log('[NAVER][INIT]', {
                    href: window.location.href,
                    code,
                    state,
                    savedState,
                    REDIRECT_URI,
                });

                // A. 처음 진입(= code 없음) → 네이버 authorize로 보냄
                if (!code) {
                    const st = savedState || Math.random().toString(36).slice(2);
                    sessionStorage.setItem('naver_state', st);

                    const authorizeUrl =
                        `https://nid.naver.com/oauth2.0/authorize` +
                        `?response_type=code` +
                        `&client_id=${encodeURIComponent(NAVER_CLIENT_ID)}` +
                        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` + // ← 콘솔 등록값과 100% 동일
                        `&state=${encodeURIComponent(st)}`;

                    console.log('[NAVER][AUTHORIZE] redirect →', authorizeUrl);
                    window.location.replace(authorizeUrl);
                    return;
                }

                // B. 돌아옴(code 있음) → state 확인
                if (savedState && state && savedState !== state) {
                    console.error('[NAVER][STATE_MISMATCH]', { savedState, state });
                    throw new Error('state_mismatch');
                }

                // 1) exchange
                setMsg('토큰 교환 중…');
                const exPayload = { code, state, redirect_uri: REDIRECT_URI };
                console.log('[NAVER][EXCHANGE>payload]', exPayload);

                const ex = await fetch(EXCHANGE_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(exPayload),
                });

                const exStatus = ex.status;
                const exText = await ex.text(); // 원문 먼저 확보
                let exJson = null;
                try {
                    exJson = JSON.parse(exText);
                } catch (err) {
                    console.warn('[NAVER][EXCHANGE>parse_error]', err, exText);
                }
                console.log('[NAVER][EXCHANGE>resp]', exStatus, exText);

                if (!ex.ok || !exJson?.success || !exJson?.token?.access_token) {
                    throw new Error(`exchange_failed_${exStatus}_${exJson?.message || exText || ''}`);
                }

                // 2) 글쓰기
                setMsg('블로그에 게시 중…');
                const title = draft.title || draft.caption || '제목 없음';
                const content = draft.content || draft.caption || '';
                const image = draft.imageUrl || draft.image || '';
                const tags = Array.isArray(draft.tags) ? draft.tags.join(',') : (draft.tags || '');
                const categoryNo = draft.categoryNo ?? '';

                const postPayload = {
                    access_token: exJson.token.access_token,
                    title,
                    content,
                    image,
                    ...(categoryNo !== '' ? { categoryNo } : {}),
                    ...(tags ? { tags } : {}),
                };
                console.log('[NAVER][POST>payload]', postPayload);

                const post = await fetch(BLOG_POST_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(postPayload),
                });

                const postStatus = post.status;
                const postText = await post.text();
                let postJson = null;
                try {
                    postJson = JSON.parse(postText);
                } catch (err) {
                    console.warn('[NAVER][POST>parse_error]', err, postText);
                }
                console.log('[NAVER][POST>resp]', postStatus, postText);

                if (!post.ok || !postJson?.success) {
                    throw new Error(`post_failed_${postStatus}_${postJson?.message || postText || ''}`);
                }

                // 3) 성공 처리
                setMsg('업로드 완료!');
                sessionStorage.removeItem('naver_state'); // draft는 필요시 유지

                // 상위(WebView/부모)로 결과 통보 (있으면)
                try {
                    const payload = { type: 'SHARE_RESULT', success: true, platform: 'BLOG', post_id: null };
                    (window.opener || window.parent)?.postMessage(JSON.stringify(payload), '*');
                } catch { }

                // 돌아가기
                setTimeout(() => {
                    if (window.history.length > 1) window.history.back();
                    else window.location.href = '/';
                }, 900);

            } catch (e) {
                console.error('[NAVER][FLOW_ERROR]', e);
                console.log('[NAVER][DEBUG] href=', window.location.href);
                console.log('[NAVER][DEBUG] REDIRECT_URI=', REDIRECT_URI);
                console.log('[NAVER][DEBUG] saved_state=', sessionStorage.getItem('naver_state'));
                console.log('[NAVER][DEBUG] qs=', Object.fromEntries(new URLSearchParams(window.location.search).entries()));

                setMsg('실패했습니다. 다시 시도해 주세요.');

                try {
                    const payload = {
                        type: 'SHARE_RESULT',
                        success: false,
                        platform: 'BLOG',
                        error_code: 'naver_flow_failed',
                        message: String(e?.message || e),
                    };
                    (window.opener || window.parent)?.postMessage(JSON.stringify(payload), '*');
                } catch { }

                // setTimeout(() => {
                //     if (window.history.length > 1) window.history.back();
                //     else window.location.href = '/';
                // }, 1400);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params]);


    return (
        <div style={{ padding: '24px', fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif' }}>
            <h3>{msg}</h3>
            <p style={{ opacity: .7, fontSize: 13 }}>이 창을 닫지 마세요.</p>
        </div>
    );
}
