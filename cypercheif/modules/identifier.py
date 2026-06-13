"""
identifier.py — Heuristic engine that analyzes ciphertext and suggests
                the most likely encoding/cipher type with a confidence score.

Returns a list of dicts sorted by confidence (descending):
    [{"scheme": str, "confidence": int, "description": str}, ...]
"""

import re
import math
import string


# ─────────────────────────────────────────────
# Character-set fingerprints
# ─────────────────────────────────────────────

_HEX_CHARS      = set("0123456789ABCDEFabcdef")
_B32_CHARS      = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567=")
_B48_CHARS      = set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZbcdefghjkmnp.")
_B64_CHARS      = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=")
_B64URL_CHARS   = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=")
_B85_CHARS      = set("!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu")
_ALPHA_ONLY     = set(string.ascii_letters + " ")
_ROT13_HINT     = re.compile(r'\b(?:gur|naq|bs|vf|va|gb|Gur|Naq)\b')  # common ROT13'd English words


def _charset_coverage(text: str, charset: set) -> float:
    """Fraction of characters in `text` that belong to `charset`."""
    if not text:
        return 0.0
    return sum(1 for c in text if c in charset) / len(text)


def _shannon_entropy(text: str) -> float:
    """Calculate Shannon entropy of a string."""
    if not text:
        return 0.0
    freq = {}
    for c in text:
        freq[c] = freq.get(c, 0) + 1
    n = len(text)
    return -sum((f / n) * math.log2(f / n) for f in freq.values())


def _is_valid_base64(text: str) -> bool:
    """Quick structural check for Base64."""
    stripped = text.strip()
    if len(stripped) % 4 != 0:
        return False
    return bool(re.fullmatch(r'[A-Za-z0-9+/]*={0,2}', stripped))


def _is_valid_base32(text: str) -> bool:
    stripped = text.strip().upper()
    return bool(re.fullmatch(r'[A-Z2-7]*={0,6}', stripped)) and len(stripped) % 8 == 0


def _looks_like_base48(text: str) -> bool:
    return "." in text and _charset_coverage(text, _B48_CHARS) > 0.95


def identify(text: str) -> list[dict]:
    """
    Analyze `text` and return ranked list of likely encoding/cipher types.
    Each entry: {"scheme": str, "confidence": int, "description": str}
    """
    text = text.strip()
    if not text:
        return []

    results = []
    entropy = _shannon_entropy(text)
    length  = len(text)
    chars   = set(text)

    # ── MD5 ──────────────────────────────────
    if length == 32 and chars <= _HEX_CHARS:
        results.append({
            "scheme": "MD5 Hash",
            "confidence": 95,
            "description": "32 hex characters — classic MD5 fingerprint length."
        })

    # ── SHA-1 ─────────────────────────────────
    if length == 40 and chars <= _HEX_CHARS:
        results.append({
            "scheme": "SHA-1 Hash",
            "confidence": 92,
            "description": "40 hex characters — matches SHA-1 digest length."
        })

    # ── SHA-256 ───────────────────────────────
    if length == 64 and chars <= _HEX_CHARS:
        results.append({
            "scheme": "SHA-256 Hash",
            "confidence": 95,
            "description": "64 hex characters — matches SHA-256 digest length."
        })

    # ── BASE 16 ───────────────────────────────
    if chars <= _HEX_CHARS and length % 2 == 0 and length not in (32, 40, 64):
        conf = 80 if length > 4 else 50
        results.append({
            "scheme": "Base16 (Hex)",
            "confidence": conf,
            "description": f"All characters are valid hex digits and length ({length}) is even."
        })

    # ── BASE 64 ───────────────────────────────
    if _is_valid_base64(text):
        results.append({
            "scheme": "Base64",
            "confidence": 88,
            "description": "Valid Base64 character set with correct padding structure."
        })
    elif "=" not in text and chars <= _B64_CHARS and _charset_coverage(text, _B64_CHARS) > 0.97:
        results.append({
            "scheme": "Base64 (no padding)",
            "confidence": 72,
            "description": "Characters consistent with Base64 but missing standard padding."
        })

    # ── BASE 64 URL-SAFE ──────────────────────
    if chars <= _B64URL_CHARS and ("-" in chars or "_" in chars):
        results.append({
            "scheme": "Base64 URL-safe",
            "confidence": 80,
            "description": "Contains '-' or '_' — hallmark of URL-safe Base64."
        })

    # ── BASE 32 ───────────────────────────────
    if _is_valid_base32(text):
        results.append({
            "scheme": "Base32",
            "confidence": 85,
            "description": "Valid Base32 character set (A-Z, 2-7) with correct padding."
        })
    elif chars <= _B32_CHARS and text.upper() == text:
        results.append({
            "scheme": "Base32 (possible)",
            "confidence": 60,
            "description": "Uppercase-only with Base32-compatible characters."
        })

    # ── BASE 85 ───────────────────────────────
    if chars <= _B85_CHARS and entropy > 5.0:
        results.append({
            "scheme": "Base85",
            "confidence": 70,
            "description": "High entropy and diverse ASCII character set typical of Base85."
        })

    # ── BASE 48 ───────────────────────────────
    if _looks_like_base48(text):
        results.append({
            "scheme": "Base48",
            "confidence": 78,
            "description": "Dot-separated format consistent with custom Base48 encoding."
        })

    # ── ROT13 ─────────────────────────────────
    if chars <= _ALPHA_ONLY and _ROT13_HINT.search(text):
        results.append({
            "scheme": "ROT13",
            "confidence": 82,
            "description": "Alphabetic-only text with common ROT13'd English stop-words detected."
        })

    # ── CAESAR CIPHER ─────────────────────────
    if chars <= _ALPHA_ONLY and entropy < 4.0 and not _ROT13_HINT.search(text):
        results.append({
            "scheme": "Caesar Cipher",
            "confidence": 55,
            "description": "Alphabetic-only text with low entropy — consistent with a simple Caesar shift."
        })

    # ── VIGENÈRE CIPHER ───────────────────────
    if chars <= set(string.ascii_letters + " ") and 4.0 <= entropy <= 5.5 and length > 20:
        results.append({
            "scheme": "Vigenère Cipher",
            "confidence": 50,
            "description": "Alphabetic text with moderate entropy — may be Vigenère-encoded."
        })

    # ── PLAIN TEXT fallback ───────────────────
    if not results:
        results.append({
            "scheme": "Plain Text / Unknown",
            "confidence": 30,
            "description": "No strong encoding signature detected. May be plain text or an exotic encoding."
        })

    # Sort by confidence descending
    return sorted(results, key=lambda x: x["confidence"], reverse=True)
