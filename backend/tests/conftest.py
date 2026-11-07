import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import get_settings  # noqa: E402
from model import load_bundle  # noqa: E402
from schemas import RateInfo  # noqa: E402

SAMPLE = dict(carat=1.0, cut="Ideal", color="G", clarity="VS2", depth=61.5, table=57.0, x=6.4, y=6.4, z=3.95)


@pytest.fixture(scope="session")
def bundle():
    return load_bundle(get_settings().artifacts_dir)


@pytest.fixture
def sample():
    return dict(SAMPLE)


def make_rate(rate=90.0, **kw) -> RateInfo:
    base = dict(rate=rate, source="test", as_of="2026-01-01", fetched_at=datetime.now(timezone.utc),
                is_fallback=False, is_stale=False)
    base.update(kw)
    return RateInfo(**base)
