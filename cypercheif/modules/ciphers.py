"""
ciphers.py — ROT13, Caesar, and Vigenère cipher implementations.
All functions return a (result: str, error: str | None) tuple.
"""


# ─────────────────────────────────────────────
# ROT13
# ─────────────────────────────────────────────

def rot13_encode(text: str) -> tuple[str, str | None]:
    """ROT13 is its own inverse — encode and decode are identical."""
    try:
        result = text.translate(str.maketrans(
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
            "NOPQRSTUVWXYZABCDEFGHIJKLMnopqrstuvwxyzabcdefghijklm"
        ))
        return result, None
    except Exception as e:
        return "", str(e)


def rot13_decode(text: str) -> tuple[str, str | None]:
    return rot13_encode(text)  # ROT13 is symmetric


# ─────────────────────────────────────────────
# CAESAR CIPHER
# ─────────────────────────────────────────────

def caesar_encode(text: str, shift: int) -> tuple[str, str | None]:
    """Shift alphabetic characters by `shift` positions, preserve case and non-alpha."""
    try:
        shift = shift % 26
        result = []
        for ch in text:
            if ch.isalpha():
                base = ord('A') if ch.isupper() else ord('a')
                result.append(chr((ord(ch) - base + shift) % 26 + base))
            else:
                result.append(ch)
        return "".join(result), None
    except Exception as e:
        return "", str(e)


def caesar_decode(text: str, shift: int) -> tuple[str, str | None]:
    """Reverse the Caesar shift."""
    return caesar_encode(text, -shift)


# ─────────────────────────────────────────────
# VIGENÈRE CIPHER
# ─────────────────────────────────────────────

def _validate_vigenere_key(key: str) -> str | None:
    """Returns error message if key is invalid, else None."""
    if not key:
        return "Vigenère key cannot be empty."
    if not key.isalpha():
        return "Vigenère key must contain only alphabetic characters."
    return None


def vigenere_encode(text: str, key: str) -> tuple[str, str | None]:
    """Polyalphabetic substitution — encode with Vigenère key."""
    err = _validate_vigenere_key(key)
    if err:
        return "", err
    try:
        key = key.upper()
        result = []
        key_index = 0
        for ch in text:
            if ch.isalpha():
                shift = ord(key[key_index % len(key)]) - ord('A')
                base = ord('A') if ch.isupper() else ord('a')
                result.append(chr((ord(ch) - base + shift) % 26 + base))
                key_index += 1
            else:
                result.append(ch)
        return "".join(result), None
    except Exception as e:
        return "", str(e)


def vigenere_decode(text: str, key: str) -> tuple[str, str | None]:
    """Reverse Vigenère encoding."""
    err = _validate_vigenere_key(key)
    if err:
        return "", err
    try:
        key = key.upper()
        result = []
        key_index = 0
        for ch in text:
            if ch.isalpha():
                shift = ord(key[key_index % len(key)]) - ord('A')
                base = ord('A') if ch.isupper() else ord('a')
                result.append(chr((ord(ch) - base - shift) % 26 + base))
                key_index += 1
            else:
                result.append(ch)
        return "".join(result), None
    except Exception as e:
        return "", str(e)
