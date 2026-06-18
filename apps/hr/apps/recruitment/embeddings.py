"""Swappable text-embedding layer for hybrid resume matching (Phase 4).

Default backend: local ONNX via `fastembed` (all-MiniLM, 384-dim) — no torch, no
external vendor, no per-call cost. Everything degrades gracefully: if the model or
its deps are unavailable, embed_* returns None and callers fall back to LLM-only
ranking (Phase 3).

To swap providers (e.g. Voyage AI, pgvector ANN), only this module changes.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

_model = None
_load_failed = False


def _get_model():
    """Lazy-load the embedding model once per process. Returns None on failure."""
    global _model, _load_failed
    if _model is not None:
        return _model
    if _load_failed:
        return None
    try:
        from django.conf import settings
        from fastembed import TextEmbedding
        name = getattr(settings, "EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        _model = TextEmbedding(model_name=name)
        logger.info("Loaded embedding model %s", name)
        return _model
    except Exception:
        logger.exception("Embedding model unavailable — ranking will fall back to LLM-only")
        _load_failed = True
        return None


def embeddings_available() -> bool:
    return _get_model() is not None


def embed_texts(texts: list[str]) -> list[list[float] | None]:
    """Embed a batch of texts. Returns a same-length list; failures yield None."""
    items = list(texts or [])
    if not items:
        return []
    model = _get_model()
    if model is None:
        return [None] * len(items)
    try:
        # fastembed yields numpy arrays in input order.
        return [[float(x) for x in vec] for vec in model.embed(items)]
    except Exception:
        logger.exception("Embedding batch failed")
        return [None] * len(items)


def embed_text(text: str) -> list[float] | None:
    if not text or not text.strip():
        return None
    out = embed_texts([text])
    return out[0] if out else None


def cosine(a, b) -> float:
    """Cosine similarity of two equal-length vectors. 0.0 if either is empty."""
    if not a or not b:
        return 0.0
    try:
        import numpy as np
        va = np.asarray(a, dtype="float32")
        vb = np.asarray(b, dtype="float32")
        na = float(np.linalg.norm(va))
        nb = float(np.linalg.norm(vb))
        if na == 0.0 or nb == 0.0:
            return 0.0
        return float(np.dot(va, vb) / (na * nb))
    except Exception:
        logger.exception("cosine failed")
        return 0.0
