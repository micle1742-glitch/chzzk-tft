import { createHash, randomBytes } from "node:crypto";

/*
 * 비밀 OBS 오버레이 주소의 토큰·관리 키 (docs/sql/007_create_overlays.sql)
 * - 앱 코드는 이 파일이 아니라 app/lib/overlay-token.ts를 import한다 (server-only로 브라우저 번들 차단)
 *   이 파일은 node --test가 server-only 없이 불러올 수 있도록 계산만 분리한 것. 테스트: overlay-token.test.mjs
 * - 오버레이 토큰: 주소(/overlay/tft/<토큰>)에 들어가는 값. 이것만으로는 재발급·삭제를 할 수 없다
 * - 관리 키: 재발급·삭제 권한. 오버레이 토큰과 별개의 난수
 * - 둘 다 32바이트(256비트) 안전한 난수 → base64url 43자 (URL에 그대로 쓸 수 있고 '=' 패딩 없음)
 * - DB에는 원문 대신 SHA-256 hex(64자)만 저장한다 (sessions와 같은 방식)
 * - 원문·해시는 로그·에러 메시지에 넣지 않는다 (이 파일은 아무것도 출력하지 않는다)
 * - 서버 환경 변수(비밀값)를 쓰지 않는다. 비밀은 난수 자체라서 NEXT_PUBLIC_ 변수도 필요 없다
 */

const SECRET_BYTES = 32;
// 32바이트를 base64url로 바꾸면 항상 43자 (256비트 = 6비트 × 42자 + 4비트)
export const OVERLAY_SECRET_LENGTH = 43;
const BASE64URL_43 = /^[A-Za-z0-9_-]{43}$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;

function generateSecret(): string {
  return randomBytes(SECRET_BYTES).toString("base64url");
}

// 오버레이 토큰 원문 (주소에 넣어 사용자에게 한 번 돌려주고, DB에는 hashOverlaySecret 값만 저장)
export function generateOverlayToken(): string {
  return generateSecret();
}

// 관리 키 원문 (HttpOnly 쿠키 등으로 사용자에게만 전달하고, DB에는 hashOverlaySecret 값만 저장)
export function generateManageKey(): string {
  return generateSecret();
}

// 토큰·관리 키 공용 SHA-256 hex. DB의 token_hash·manage_key_hash 형식과 같다
export function hashOverlaySecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

/*
 * 형식 검사 (DB 조회 전에 잘못된 값을 걸러 낸다). 맞으면 true
 * - 정확히 43자 base64url
 * - 32바이트로 되돌린 뒤 다시 인코딩했을 때 같은 문자열 (마지막 글자의 남는 비트까지 정상인 값만)
 *   → 같은 바이트를 가리키는 다른 표기가 통과하지 않는다
 */
export function isOverlaySecretFormat(value: unknown): value is string {
  if (typeof value !== "string" || !BASE64URL_43.test(value)) return false;
  const bytes = Buffer.from(value, "base64url");
  return bytes.length === SECRET_BYTES && bytes.toString("base64url") === value;
}

// 저장된 해시 형식 검사 (DB에서 읽은 값 확인용)
export function isOverlaySecretHash(value: unknown): value is string {
  return typeof value === "string" && SHA256_HEX.test(value);
}

// 발급 한 번에 필요한 값: 원문 두 개(사용자에게 전달)와 해시 두 개(DB 저장)
export type OverlaySecrets = {
  token: string;
  tokenHash: string;
  manageKey: string;
  manageKeyHash: string;
};

export function createOverlaySecrets(): OverlaySecrets {
  const token = generateOverlayToken();
  let manageKey = generateManageKey();
  // 256비트 난수가 겹칠 일은 사실상 없지만, DB의 token_hash <> manage_key_hash 제약과 맞춰 둔다
  while (manageKey === token) manageKey = generateManageKey();
  return {
    token,
    tokenHash: hashOverlaySecret(token),
    manageKey,
    manageKeyHash: hashOverlaySecret(manageKey),
  };
}
