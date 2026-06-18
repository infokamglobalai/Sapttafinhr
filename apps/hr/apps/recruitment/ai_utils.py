"""Shared helpers for recruitment AI views (Phase 1+)."""
from __future__ import annotations

import json
import logging

logger = logging.getLogger(__name__)


def parse_llm_json(raw: str) -> dict:
    """Parse a JSON object out of an LLM text response.

    Tolerates ```json ... ``` code fences and leading/trailing prose. Returns
    {} on failure (callers should treat that as "no structured data").
    """
    if not raw:
        return {}
    text = raw.strip()

    # Strip a fenced code block if present.
    if "```" in text:
        parts = text.split("```")
        # The content between the first pair of fences.
        if len(parts) >= 2:
            text = parts[1]
            if text.lstrip().lower().startswith("json"):
                text = text.lstrip()[4:]
            text = text.strip()

    try:
        return json.loads(text)
    except (ValueError, TypeError):
        # Last resort: grab the outermost {...} span.
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except (ValueError, TypeError):
                pass
        logger.warning("Could not parse LLM JSON from response")
        return {}


def band_for_score(score: int) -> str:
    """Map an overall 0-100 match score to a band label."""
    if score >= 80:
        return "Excellent"
    if score >= 60:
        return "Good"
    if score >= 40:
        return "Average"
    return "Poor"


def weighted_overall(subscores: dict, weights: dict) -> int:
    """Weighted average of dimension sub-scores → integer 0-100.

    `subscores` and `weights` are keyed by dimension (skill/experience/...).
    Dimensions with a missing/None sub-score are dropped (their weight is not
    counted). Falls back to an even average if all weights are zero.
    """
    num = den = 0.0
    for dim, w in weights.items():
        s = subscores.get(dim)
        if s is None:
            continue
        try:
            s = float(s)
            w = float(w)
        except (TypeError, ValueError):
            continue
        num += s * w
        den += w
    if den == 0:
        present = [float(subscores[d]) for d in weights if subscores.get(d) is not None]
        return round(sum(present) / len(present)) if present else 0
    return max(0, min(100, round(num / den)))
