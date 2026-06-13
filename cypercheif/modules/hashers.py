"""
hashers.py — MD5, SHA-1, and SHA-256 hash generation.
All functions return a (result: str, error: str | None) tuple.
"""

import hashlib


def _hash(text: str, algorithm: str) -> tuple[str, str | None]:
    try:
        h = hashlib.new(algorithm)
        h.update(text.encode("utf-8"))
        return h.hexdigest(), None
    except Exception as e:
        return "", str(e)


def md5_hash(text: str) -> tuple[str, str | None]:
    return _hash(text, "md5")


def sha1_hash(text: str) -> tuple[str, str | None]:
    return _hash(text, "sha1")


def sha256_hash(text: str) -> tuple[str, str | None]:
    return _hash(text, "sha256")
