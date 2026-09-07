import sys
import types
import re
from unittest.mock import MagicMock

# Mock audio C-libraries if not installed in lightweight test runner
for mod_name in ["soundfile", "librosa"]:
    if mod_name not in sys.modules:
        m = types.ModuleType(mod_name)
        m.__spec__ = types.SimpleNamespace(name=mod_name)
        sys.modules[mod_name] = m

import pytest
from datetime import datetime, timedelta, timezone

from backend.services.dictionary import apply_custom_words_correction
from backend.services.refinement import remove_filler_words_rule
from backend.services.captures import prune_expired_captures
from backend.database.models import Capture, CaptureSettings


def test_custom_words_exact_and_casing():
    custom_words = ["Rheo", "FastAPI", "PostgreSQL", "GitHub"]
    text = "welcome to rheo using fastapi and postgresql on github"
    result = apply_custom_words_correction(text, custom_words, threshold=0.8)
    assert "Rheo" in result
    assert "FastAPI" in result
    assert "PostgreSQL" in result
    assert "GitHub" in result


def test_custom_words_multi_word_phrases():
    custom_words = ["C++", "San Francisco", "OpenAI API"]
    text = "We visited san francisco to work on the openai api using c++"
    result = apply_custom_words_correction(text, custom_words, threshold=0.8)
    assert "San Francisco" in result
    assert "OpenAI API" in result
    assert "C++" in result


def test_custom_words_fuzzy_matching():
    custom_words = ["Kubernetes", "TypeScript"]
    # Typo: 'kubernets' and 'tipe script' or 'typescrip'
    text = "Deploying kubernets with typescrip code"
    result = apply_custom_words_correction(text, custom_words, threshold=0.75)
    assert "Kubernetes" in result
    assert "TypeScript" in result


def test_custom_words_below_threshold():
    custom_words = ["Anthropic"]
    # Very different word should not be replaced
    text = "The apple fell from the tree"
    result = apply_custom_words_correction(text, custom_words, threshold=0.8)
    assert "Anthropic" not in result
    assert "apple" in result


def test_custom_words_empty_or_whitespace():
    assert apply_custom_words_correction("", ["Rheo"], 0.8) == ""
    assert apply_custom_words_correction("hello world", [], 0.8) == "hello world"


def test_remove_filler_words_rule():
    text = "Um, hello there, uh, this is, er, ah, a test... hmm."
    cleaned = remove_filler_words_rule(text)
    assert not re.search(r"\bum\b", cleaned, re.IGNORECASE)
    assert not re.search(r"\buh\b", cleaned, re.IGNORECASE)
    assert not re.search(r"\ber\b", cleaned, re.IGNORECASE)
    assert not re.search(r"\bah\b", cleaned, re.IGNORECASE)
    assert not re.search(r"\bhmm\b", cleaned, re.IGNORECASE)
    assert "Hello there" in cleaned
    assert "a test" in cleaned


def test_remove_filler_words_preserves_real_words():
    text = "The summary was humming ahead on the umbrella."
    cleaned = remove_filler_words_rule(text)
    # Real words containing 'um', 'ah', 'hmm' should NOT be affected
    assert "summary" in cleaned
    assert "humming" in cleaned
    assert "ahead" in cleaned
    assert "umbrella" in cleaned


class MockQuery:
    def __init__(self, items):
        self.items = list(items)

    def order_by(self, *args, **kwargs):
        return self

    def offset(self, n):
        return MockQuery(self.items[n:])

    def limit(self, n):
        return MockQuery(self.items[:n])

    def count(self):
        return len(self.items)

    def all(self):
        return self.items

    def filter(self, *args, **kwargs):
        return self


class MockDB:
    def __init__(self, captures):
        self.captures = list(captures)
        self.deleted = []

    def query(self, model):
        return MockQuery(self.captures)

    def delete(self, obj):
        self.deleted.append(obj)
        if obj in self.captures:
            self.captures.remove(obj)

    def commit(self):
        pass


def test_prune_expired_captures_history_limit():
    settings = CaptureSettings(
        history_limit=5,
        recording_retention_period="preserve_limit"
    )
    # Create 8 mock captures
    now = datetime.utcnow()
    mock_captures = [
        Capture(id=f"cap_{i}", created_at=now - timedelta(minutes=i))
        for i in range(8)
    ]
    db = MockDB(mock_captures)
    prune_expired_captures(db, settings)
    # Should delete excess 3 captures (8 - 5 = 3)
    assert len(db.deleted) == 3
    assert len(db.captures) == 5


def test_prune_expired_captures_retention_period():
    settings = CaptureSettings(
        history_limit=200,
        recording_retention_period="3_days"
    )
    now = datetime.utcnow()
    old_cap = Capture(id="old", created_at=now - timedelta(days=5))
    fresh_cap = Capture(id="fresh", created_at=now - timedelta(hours=1))

    class FilterMockQuery(MockQuery):
        def filter(self, *args, **kwargs):
            # simulate filter(DBCapture.created_at < cutoff_date)
            return MockQuery([old_cap])

    class FilterMockDB(MockDB):
        def query(self, model):
            return FilterMockQuery(self.captures)

    db = FilterMockDB([old_cap, fresh_cap])
    prune_expired_captures(db, settings)
    assert old_cap in db.deleted
    assert fresh_cap not in db.deleted
