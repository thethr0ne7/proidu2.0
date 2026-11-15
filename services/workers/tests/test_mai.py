from pathlib import Path
from services.workers.mai import OFFICIAL_URL, parse_mai, official_url

FIXTURE = Path(__file__).parent / "fixtures" / "mai-programs-2026.html"


def test_original_captured_mai_fixture():
    records, quarantined = parse_mai(FIXTURE.read_text(encoding="utf-8"))
    assert len(records) == 2
    assert len(quarantined) == 1
    first = records[0]
    assert first.code == "01.03.02"
    assert first.city == "Москва"
    assert first.budgetSeats == 125
    assert first.paidSeats == 55
    assert first.budgetPassingScore == 275
    assert first.sourceUrl == OFFICIAL_URL
    assert len(first.content_sha256) == 64


def test_mai_source_is_restricted_to_official_url():
    assert official_url("https://priem.mai.ru/base/programs/")
    assert not official_url("https://priem.mai.ru.evil.example/base/programs/")
    assert not official_url("http://priem.mai.ru/base/programs/")
    assert not official_url("https://priem.mai.ru@evil.example/base/programs/")
    assert not official_url("https://priem.mai.ru.evil.example/base/programs")


def test_mai_unrecognized_format_is_quarantined():
    records, quarantined = parse_mai("<html><p>Unknown design</p></html>")
    assert records == []
    assert len(quarantined) == 1
    assert "Unrecognized" in quarantined[0]["reason"]
