import "server-only";

/*
 * 비밀 OBS 오버레이 토큰·관리 키 (서버 전용). 앱 코드는 이 파일만 import한다.
 * - "server-only": 클라이언트 컴포넌트에서 import하면 빌드 에러 → 생성·해시 코드가 브라우저로 나가지 않는다
 * - 실제 구현은 overlay-token-core.ts (node --test가 server-only 없이 불러올 수 있게 분리)
 */
export {
  createOverlaySecrets,
  generateManageKey,
  generateOverlayToken,
  hashOverlaySecret,
  isOverlaySecretFormat,
  isOverlaySecretHash,
  OVERLAY_SECRET_LENGTH,
  type OverlaySecrets,
} from "./overlay-token-core";
