import { createHash, timingSafeEqual } from 'node:crypto';

function sha256Digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

// Hashing first gives equal-length buffers, so timingSafeEqual never throws on length mismatch.
export function isApiKeyMatch(
  providedKey: string,
  expectedKey: string,
): boolean {
  return timingSafeEqual(sha256Digest(providedKey), sha256Digest(expectedKey));
}
