// functions/naver.js
const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });

// Cloud Functions(Node 18+)은 글로벌 fetch 지원
// (Node 16이면 node-fetch 설치해서 require('node-fetch') 사용)

const DEFAULT_REGION = "asia-northeast1";



/**
 * POST { code, state, redirect_uri }
 * - redirect_uri는 authorize 때와 100% 동일해야 함(마지막 `/` 포함 권장)
 * Response:
 *   200 { success:true, profile:{ id, email, name, profile_image, ... } }
 *   4xx/5xx { success:false, message:"..." }
 */
const naverExchange = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .region(DEFAULT_REGION)
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            try {
                if (req.method === "OPTIONS") {
                    res.set("Access-Control-Allow-Credentials", "true");
                    return res.status(204).send("");
                }
                if (req.method !== "POST") {
                    return res.status(405).json({ success: false, message: "method_not_allowed" });
                }

         

                const { code, state, redirect_uri } = req.body || {};
                if (!code || !redirect_uri) {
                    return res.status(400).json({ success: false, message: "bad_request" });
                }

                // 1) 토큰 교환
                const tokenResp = await fetch("https://nid.naver.com/oauth2.0/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        grant_type: "authorization_code",
                        client_id: "YSd2iMy0gj8Da9MZ4Unf",
                        client_secret: "aW3MyEN6YQ",
                        code,
                        state: state || "",
                        redirect_uri, // authorize 때와 완전 동일(슬래시 포함)
                    }),
                });

                let tokenJson = null;
                try {
                    tokenJson = await tokenResp.json();
                } catch (_) {
                    // no-op
                }

                if (!tokenResp.ok || !tokenJson?.access_token) {
                    functions.logger.error("NAVER token_fail", {
                        status: tokenResp.status,
                        body: tokenJson,
                    });
                    return res.status(400).json({
                        success: false,
                        message: `token_fail_${tokenResp.status}:${tokenJson?.error || ""}`,
                    });
                }

                // 2) 프로필 조회
                const meResp = await fetch("https://openapi.naver.com/v1/nid/me", {
                    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
                });

                let meJson = null;
                try {
                    meJson = await meResp.json();
                } catch (_) { }

                if (!meResp.ok || meJson?.resultcode !== "00") {
                    functions.logger.error("NAVER me_fail", {
                        status: meResp.status,
                        body: meJson,
                    });
                    return res.status(400).json({
                        success: false,
                        message: `me_fail_${meResp.status}:${meJson?.message || ""}`,
                    });
                }

                // 성공
                const profile = meJson.response || null;
                functions.logger.info("NAVER exchange OK", { id: profile?.id });
                res.set("Cache-Control", "no-store");
                return res.status(200).json({ success: true, profile });
            } catch (e) {
                functions.logger.error("NAVER exchange error", e);
                return res.status(500).json({ success: false, message: String(e?.message || e) });
            }
        });
    });

module.exports = { naverExchange };
