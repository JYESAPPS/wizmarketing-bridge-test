// functions/post.js
// 네이버 블로그 글쓰기 전용 HTTPS 함수 (Firestore 사용 안 함)
// - Body: { access_token, title, content, categoryNo?, tags?, image? }
// - 단일 이미지(HTTPS)만 본문 상단에 삽입
// - 상세 로그를 남겨 디버깅 용이

const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });

const DEFAULT_REGION = "asia-northeast1";
const MAX_TITLE_LEN = 80;
const MAX_CONTENT_LEN = 20000;

exports.naverBlogPost = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .region(DEFAULT_REGION)
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            // 요청 추적용 ID & 로거
            const reqId = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
            const info = (msg, obj) => {
                functions.logger.info(`[POST ${reqId}] ${msg}`, obj || {});
                console.log(`[POST ${reqId}] ${msg}`, obj || {});     // 추가
            };
            const error = (msg, obj) => {
                functions.logger.error(`[POST ${reqId}] ${msg}`, obj || {});
                console.error(`[POST ${reqId}] ${msg}`, obj || {});   // 추가
            };
            try {
                if (req.method === "OPTIONS") {
                    res.set("Access-Control-Allow-Credentials", "true");
                    return res.status(204).send("");
                }
                if (req.method !== "POST") {
                    return res.status(405).json({ success: false, message: "method_not_allowed" });
                }

                const { access_token, title, content, categoryNo, tags, image } = req.body || {};
                info("start", {
                    origin: req.get("origin"),
                    referer: req.get("referer"),
                    has_token: !!access_token,
                    title_len: title ? String(title).length : 0,
                    content_len: content ? String(content).length : 0,
                    has_image: !!image,
                    categoryNo
                });

                if (!access_token || !title || !content) {
                    error("missing_params", { access_token: !!access_token, title: !!title, content: !!content });
                    return res.status(400).json({ success: false, message: "missing_params" });
                }

                // 안전 가드
                const safeTitle = String(title).slice(0, MAX_TITLE_LEN);
                const safeContent = String(content).slice(0, MAX_CONTENT_LEN);

                // 단일 이미지 태그(HTTPS만)
                let imgTag = "";
                if (typeof image === "string" && /^https:\/\//i.test(image)) {
                    const esc = image.replace(/"/g, "&quot;");
                    imgTag = `<p style="margin:0 0 16px"><img src="${esc}" alt="" style="max-width:100%;height:auto" /></p>`;
                }

                // 최종 본문 (이미지 1장 + 내용)
                const htmlContent =
                    `${imgTag}<div style="font-size:16px;line-height:1.7;word-break:break-word">${safeContent}</div>`;

                // 태그 문자열 처리
                let tagsStr = "";
                if (Array.isArray(tags)) tagsStr = tags.join(",");
                else if (typeof tags === "string") tagsStr = tags;

                // 네이버 글쓰기 파라미터
                const params = new URLSearchParams({
                    title: safeTitle,
                    contents: htmlContent,
                });
                if (categoryNo === 0 || categoryNo) params.set("categoryNo", String(categoryNo));
                if (tagsStr) params.set("tags", tagsStr);

                info("call_writePost.json", {
                    url: "https://openapi.naver.com/blog/writePost.json",
                    has_image_tag: !!imgTag,
                    tags: tagsStr,
                });

                const resp = await fetch("https://openapi.naver.com/blog/writePost.json", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: params,
                });

                const status = resp.status;
                const text = await resp.text(); // 원문 먼저 확보
                let json = null;
                try { json = JSON.parse(text); } catch (e) {
                    info("resp_parse_fail", { snippet: text.slice(0, 500) });
                }

                info("resp", { status, ok: resp.ok, body_snippet: text.slice(0, 500) });

                if (!resp.ok || (json && (json.error || json.errorCode))) {
                    error("blog_post_fail", { status, body: json || text });
                    return res.status(400).json({
                        success: false,
                        message: `blog_post_fail_${status}`,
                        debug: json || text,
                        _reqId: reqId,
                    });
                }

                res.set("Cache-Control", "no-store");
                return res.status(200).json({ success: true, result: json || {}, _reqId: reqId });
            } catch (e) {
                error("exception", { message: String(e?.message || e), stack: e?.stack });
                return res.status(500).json({ success: false, message: String(e?.message || e), _reqId: reqId });
            }
        });
    });
