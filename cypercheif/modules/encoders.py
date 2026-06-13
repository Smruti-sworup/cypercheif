"""
encoders.py — Base16, Base32, Base48, Base64, Base85 encode/decode logic.
All functions return a (result: str, error: str | None) tuple.
"""

import base64
import binascii


# ─────────────────────────────────────────────
# BASE 16
# ─────────────────────────────────────────────

def base16_encode(text: str) -> tuple[str, str | None]:
    try:
        encoded = base64.b16encode(text.encode("utf-8")).decode("ascii")
        return encoded, None
    except Exception as e:
        return "", str(e)


def base16_decode(text: str) -> tuple[str, str | None]:
    try:
        # Accept both upper and lower case hex
        decoded = base64.b16decode(text.upper()).decode("utf-8")
        return decoded, None
    except Exception as e:
        return "", f"Invalid Base16 input: {e}"


# ─────────────────────────────────────────────
# BASE 32
# ─────────────────────────────────────────────

def base32_encode(text: str) -> tuple[str, str | None]:
    try:
        encoded = base64.b32encode(text.encode("utf-8")).decode("ascii")
        return encoded, None
    except Exception as e:
        return "", str(e)


def base32_decode(text: str) -> tuple[str, str | None]:
    try:
        # Add padding if missing
        padded = text.upper()
        padding_needed = (8 - len(padded) % 8) % 8
        padded += "=" * padding_needed
        decoded = base64.b32decode(padded).decode("utf-8")
        return decoded, None
    except Exception as e:
        return "", f"Invalid Base32 input: {e}"


# ─────────────────────────────────────────────
# BASE 48  (custom implementation)
# Alphabet: digits + uppercase alpha + 12 lowercase = 10+26+12 = 48
# Chosen to avoid visually ambiguous chars (0/O, 1/I/l, etc.)
# Alphabet: 0-9, A-Z (26), b c d e f g h j k m (10 lowercase = 36+12=48)
# ─────────────────────────────────────────────

_B48_ALPHABET = (
    "0123456789"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "bcdefghjkmnp"
)  # 48 characters

assert len(_B48_ALPHABET) == 48, "Base48 alphabet must have exactly 48 chars"
_B48_ENCODE_MAP = {i: c for i, c in enumerate(_B48_ALPHABET)}
_B48_DECODE_MAP = {c: i for i, c in enumerate(_B48_ALPHABET)}


def _int_to_base48(n: int) -> str:
    if n == 0:
        return _B48_ALPHABET[0]
    digits = []
    while n > 0:
        digits.append(_B48_ENCODE_MAP[n % 48])
        n //= 48
    return "".join(reversed(digits))


def _base48_to_int(s: str) -> int:
    result = 0
    for c in s:
        if c not in _B48_DECODE_MAP:
            raise ValueError(f"Invalid Base48 character: '{c}'")
        result = result * 48 + _B48_DECODE_MAP[c]
    return result


def base48_encode(text: str) -> tuple[str, str | None]:
    try:
        raw = text.encode("utf-8")
        # Encode length prefix so we can recover exact bytes on decode
        length = len(raw)
        # Convert bytes to a big integer
        num = int.from_bytes(raw, byteorder="big") if raw else 0
        encoded_data = _int_to_base48(num) if num else _B48_ALPHABET[0]
        encoded_len = _int_to_base48(length)
        # Format: <len_part>.<data_part>
        result = f"{encoded_len}.{encoded_data}"
        return result, None
    except Exception as e:
        return "", str(e)


def base48_decode(text: str) -> tuple[str, str | None]:
    try:
        text = text.strip()
        if "." not in text:
            raise ValueError("Invalid Base48 format — expected '<len>.<data>'")
        len_part, data_part = text.split(".", 1)
        length = _base48_to_int(len_part)
        num = _base48_to_int(data_part)
        raw = num.to_bytes(length, byteorder="big") if length else b""
        return raw.decode("utf-8"), None
    except Exception as e:
        return "", f"Invalid Base48 input: {e}"


# ─────────────────────────────────────────────
# BASE 64
# ─────────────────────────────────────────────

def base64_encode(text: str, url_safe: bool = False) -> tuple[str, str | None]:
    try:
        raw = text.encode("utf-8")
        if url_safe:
            encoded = base64.urlsafe_b64encode(raw).decode("ascii")
        else:
            encoded = base64.b64encode(raw).decode("ascii")
        return encoded, None
    except Exception as e:
        return "", str(e)


def base64_decode(text: str, url_safe: bool = False) -> tuple[str, str | None]:
    try:
        text = text.strip()
        # Add padding if missing
        padding = 4 - len(text) % 4
        if padding != 4:
            text += "=" * padding
        if url_safe:
            decoded = base64.urlsafe_b64decode(text).decode("utf-8")
        else:
            decoded = base64.b64decode(text).decode("utf-8")
        return decoded, None
    except Exception as e:
        return "", f"Invalid Base64 input: {e}"


# ─────────────────────────────────────────────
# BASE 85
# ─────────────────────────────────────────────

def base85_encode(text: str) -> tuple[str, str | None]:
    try:
        encoded = base64.b85encode(text.encode("utf-8")).decode("ascii")
        return encoded, None
    except Exception as e:
        return "", str(e)


def base85_decode(text: str) -> tuple[str, str | None]:
    try:
        decoded = base64.b85decode(text.strip()).decode("utf-8")
        return decoded, None
    except Exception as e:
        return "", f"Invalid Base85 input: {e}"
