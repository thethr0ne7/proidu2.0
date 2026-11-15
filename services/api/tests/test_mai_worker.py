"""Parity fixture from ai-platform-core/test/fixtures/mai-programs-2026.html."""
from datetime import datetime, timezone
from pathlib import Path
import pytest

from services.worker.mai import MAI_URL, fetch_mai_html, parse_mai_html

FIXTURE = Path(__file__).parent / "fixtures" / "mai-programs-2026.html"


def test_mai_parses_official_captured_fixture_and_quarantines_incomplete():
    rows, bad = parse_mai_html(FIXTURE.read_text("utf-8"))
    assert len(rows) == 2, rows
    assert len(bad) == 1, bad
    assert bad[0]["code"] == "99.99.99"
    assert rows[0]["title"] == "Прикладная математика и информатика"
    assert rows[0]["code"] == "01.03.02"
    assert rows[0]["budgetSeats"] == 125
    assert rows[0]["paidSeats"] == 55
    assert rows[0]["budgetPassingScore"] == 275
    assert rows[0]["paidPassingScore"] == 220
    assert "Информатика или физика" in rows[0]["exams"]
    assert rows[1]["title"] == "Программная инженерия"
    assert rows[1]["code"] == "09.03.04"


def test_mai_official_only_source_policy_and_bounded_fixture():
    with pytest.raises(ValueError):
        fetch_mai_html("http://priem.mai.ru/base/programs/", lambda _: "")
    with pytest.raises(ValueError):
        fetch_mai_html("https://example.com/base/programs/", lambda _: "")
    with pytest.raises(ValueError):
        fetch_mai_html("https://priem.mai.ru.evil.example/base/programs/", lambda _: "")
    with pytest.raises(ValueError):
        fetch_mai_html(MAI_URL, lambda _: "x" * 3_000_001)
    assert fetch_mai_html(MAI_URL, lambda _: "<h3>OK</h3>") == "<h3>OK</h3>"
