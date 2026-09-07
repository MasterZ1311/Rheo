"""
Custom words vocabulary dictionary and fuzzy matching correction.

Ports custom vocabulary dictionary features to Rheo. When speech-to-text
models mishear technical terms, brand names, or proper nouns (e.g. "rio" -> "Rheo",
"coobernetes" -> "Kubernetes", "post gres" -> "PostgreSQL"), this service automatically
corrects them using exact case-insensitive normalization and sequence similarity fuzzy matching.
"""

from difflib import SequenceMatcher
import re
from typing import Sequence


def _clean_token(token: str) -> tuple[str, str, str]:
    """Split a token into leading sentence punctuation, core word, and trailing sentence punctuation."""
    match = re.match(r"^([,\.!?;:\"'()\[\]{}<>]*)(\S*?)([,\.!?;:\"'()\[\]{}<>]*)$", token)
    if not match:
        return "", token, ""
    return match.group(1), match.group(2), match.group(3)


def apply_custom_words_correction(
    text: str,
    custom_words: Sequence[str] | None,
    threshold: float = 0.8,
) -> str:
    """
    Apply custom word corrections to transcribed text.

    Args:
        text: Input transcript.
        custom_words: List of custom words or phrases (e.g. ["Rheo", "PostgreSQL", "Kubernetes"]).
        threshold: Minimum similarity ratio (0.0 - 1.0) for fuzzy replacement. Defaults to 0.8.

    Returns:
        Corrected transcript with canonical custom words applied.
    """
    if not text or not custom_words:
        return text

    # Filter and deduplicate custom words
    canonical_words = [w.strip() for w in custom_words if w and w.strip()]
    if not canonical_words:
        return text

    # Sort custom words: longer phrases first so multi-word replacements take precedence
    canonical_words.sort(key=lambda w: (len(w.split()), len(w)), reverse=True)

    result = text

    # 1. First pass: Multi-word phrase replacements (both exact and spacing variants)
    for cw in canonical_words:
        cw_tokens = cw.split()
        if len(cw_tokens) > 1:
            # Match multi-word phrase case-insensitively with flexible whitespace/hyphen
            phrase_pattern = r"\b" + r"[\s\-_]+".join(re.escape(t) for t in cw_tokens) + r"\b"
            result = re.sub(
                phrase_pattern,
                cw,
                result,
                flags=re.IGNORECASE,
            )
        else:
            # Single word that might have been transcribed as separate words
            # e.g., "Rheo" might be transcribed as "Rio" or "rheo"
            # If the single word has uppercase camelCase or known sub-parts
            subwords = re.findall(r"[A-Z][a-z0-9]*|[a-z0-9]+", cw)
            if len(subwords) > 1:
                joined_pattern = r"\b" + r"[\s\-_]+".join(re.escape(s) for s in subwords) + r"\b"
                result = re.sub(
                    joined_pattern,
                    cw,
                    result,
                    flags=re.IGNORECASE,
                )

    # 2. Second pass: Token-level exact case-normalization and fuzzy matching
    # Map lowercase single-word custom words for instant O(1) lookup
    single_custom_words = [cw for cw in canonical_words if len(cw.split()) == 1]
    lower_map = {cw.lower(): cw for cw in single_custom_words}

    tokens = result.split()
    corrected_tokens: list[str] = []

    for token in tokens:
        leading, core, trailing = _clean_token(token)
        if not core:
            corrected_tokens.append(token)
            continue

        core_lower = core.lower()

        # Check exact case-insensitive match first
        if core_lower in lower_map:
            corrected_tokens.append(f"{leading}{lower_map[core_lower]}{trailing}")
            continue

        # Fuzzy match for words of length >= 4 (prevent accidental replacement of short words)
        best_match: str | None = None
        best_score = 0.0

        if len(core) >= 4 and threshold < 1.0:
            for cw in single_custom_words:
                cw_lower = cw.lower()
                # Skip if length difference is too large to meet threshold
                len_diff = abs(len(core_lower) - len(cw_lower))
                max_len = max(len(core_lower), len(cw_lower))
                if max_len > 0 and (1.0 - (len_diff / max_len)) < threshold:
                    continue

                score = SequenceMatcher(None, core_lower, cw_lower).ratio()
                if score >= threshold and score > best_score:
                    best_score = score
                    best_match = cw

        if best_match is not None:
            corrected_tokens.append(f"{leading}{best_match}{trailing}")
        else:
            corrected_tokens.append(token)

    return " ".join(corrected_tokens)
