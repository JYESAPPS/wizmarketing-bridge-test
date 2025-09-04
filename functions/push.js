// functions/push.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

try { admin.app(); } catch (_) { admin.initializeApp(); }

const CHANNEL_ID = "custom_channel_id_v2";
const DEFAULT_REGION = "asia-northeast1";

// (옵션) 간단 보안: firebase functions:config:set webpush.secret="YOUR_SECRET"
const SECRET = functions.config().webpush?.secret || "";

// 공통 발송기
async function sendFCM({ token, title, body, image, androidOverride = {} }) {
    if (!token) throw new Error("FCM token is required");
    return admin.messaging().send({
        token,
        notification: { title, body, ...(image ? { image } : {}) },
        android: { notification: { channel_id: CHANNEL_ID, sound: "alarm_sound", ...androidOverride } },
    });
}

// 간단 sleep
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * POST /sendPush
 * Body: { token, title, body, image? }
 * Header(선택): x-webpush-secret: {SECRET}
 * 동작: 수신 후 15초 기다렸다가 발송
 */
const sendPush = functions
    .runWith({ timeoutSeconds: 120, memory: "256MB" }) // 15초 딜레이+전송 여유
    .region(DEFAULT_REGION)
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            try {
                if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

                if (SECRET && req.headers["x-webpush-secret"] !== SECRET) {
                    return res.status(401).json({ error: "unauthorized" });
                }

                const { token, title = "테스트 푸시", body = "본문", image } = req.body || {};
                if (!token) return res.status(400).json({ error: "token required" });

                // 15초 대기 (창 닫을 시간)
                const DELAY_SEC = 15;
                await sleep(DELAY_SEC * 1000);

                const messageId = await sendFCM({ token: String(token).trim(), title, body, image });
                functions.logger.info("sendPush OK", { messageId });
                return res.status(200).json({ messageId, delayed: true, delaySec: DELAY_SEC });
            } catch (e) {
                functions.logger.error("sendPush FAIL", e);
                return res.status(500).json({ error: e.message });
            }
        });
    });

module.exports = { sendPush };
