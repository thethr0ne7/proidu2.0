"""PROIDU-MAI independent Python adapter, migrated from ai-platform-core v0.11.
Source: https://github.com/thethr0ne7/ai-platform-core/blob/main/src/proidu-mai.ts
Only 2026 official MAI HTML has a fixture. Fail closed on changed formats.
NO candidate may be auto-marked as verified by this parser.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from hashlib import sha256
from html import unescape
from html.parser import HTMLParser
from urllib.parse import urlparse
import json
import re

OFFICIAL_URL = "https://priem.mai.ru/base/programs/"
INSTITUTION = "Московский авиационный институт"
YEAR = 2026
CODE_RE = re.compile(r"^\d{2}\.\d{2}\.\d{2}$")
HEADER_RE = re.compile(r"<h3[^>]*>([\s\S]*?)</h3>", re.IGNORECASE)
PAIR_RE = re.compile(r"^\s*([\d\s]+|[-–—])\s*/\s*([\d\s]+|[-–—])\s*$")
CITIES = re.compile("Москва|Жуковский|Ступино")
STUDY_FORMS = re.compile(r"Очно-заоч\.?|Заоч\.?|Очная")
EXAMS = {
    "M": "Математика", "И/Ф": "Информатика или физика",
    "Ф": "Физика", "Г": "География",
    "M/Б": "Математика или биология",
    "M/И": "Математика или информатика",
    "Р": "Русский язык",
}


def official_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        return (parsed.scheme == "https" and parsed.hostname == "priem.mai.ru"
                and parsed.port in (None, 443) and not parsed.username
                and not parsed.password and parsed.path.startswith("/base/programs/"))
    except ValueError:
        return False


def _text_lines(fragment: str) -> list[str]:
    fragment = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>", " ", fragment, flags=re.I)
    fragment = re.sub(r"<br\s*/?>", "\n", fragment, flags=re.I)
    fragment = re.sub(r"</p>|</div>|</li>|</tr>|</h[1-6]>", "\n", fragment, flags=re.I)
    fragment = re.sub(r"<[^>]+>", " ", fragment)
    return [value for line in unescape(fragment).splitlines()
            if (value := re.sub(r"\s+", " ", line).strip())]


def _num(value: str) -> int | None:
    value = re.sub(r"\s+", "", value).replace("–", "-").replace("—", "-")
    if value in ("", "-"):
        return None
    number = int(value)
    return number


def _exams(descriptor: str) -> list[str]:
    city = CITIES.search(descriptor)
    prefix = descriptor[:city.start()] if city else descriptor
    return [EXAMS.get(part, part) for part in prefix.split() if part]


@dataclass(frozen=True)
class MaiProgram:
    institution: str
    admissionYear: int
    title: str
    code: str
    exams: list[str]
    city: str
    studyForm: str
    budgetSeats: int | None
    paidSeats: int | None
    budgetPassingScore: int | None
    paidPassingScore: int | None
    sourceUrl: str

    @property
    def content_sha256(self) -> str:
        data = json.dumps(asdict(self), sort_keys=True, ensure_ascii=False, separators=(",", ":"))
        return sha256(data.encode("utf-8")).hexdigest()


def parse_mai(html: str, source_url: str = OFFICIAL_URL
              ) -> tuple[list[MaiProgram], list[dict]]:
    if not official_url(source_url):
        raise ValueError("Only the official MAI programs page is allowed")
    headings = list(HEADER_RE.finditer(html))
    if not headings:
        # Fail closed: do not treat the disappearance of the old format as zero actual admissions.
        return [], [{"reason": "Unrecognized MAI document format: no h3 program sections"}]
    valid = []
    quarantined = []
    for idx, heading in enumerate(headings):
        title = " ".join(_text_lines(heading.group(1)))
        end = headings[idx + 1].start() if idx + 1 < len(headings) else len(html)
        lines = _text_lines(html[heading.end():end])
        code_idx = next((i for i, s in enumerate(lines) if CODE_RE.fullmatch(s)), -1)
        if code_idx < 0:
            continue
        code = lines[code_idx]
        descriptor = lines[code_idx + 1] if len(lines) > code_idx + 1 else ""
        parsed = []
        for line in lines[code_idx + 2:]:
            match = PAIR_RE.fullmatch(line)
            if match:
                parsed.append((_num(match.group(1)), _num(match.group(2))))
        city_match = CITIES.search(descriptor)
        study_match = STUDY_FORMS.search(descriptor)
        if (not title or not city_match or not study_match or len(parsed) < 2
                or not _exams(descriptor)):
            quarantined.append({"title": title, "code": code,
                                "reason": "Required MAI admission fields missing"})
            continue
        seats, scores = parsed[:2]
        valid.append(MaiProgram(
            institution=INSTITUTION, admissionYear=YEAR, title=title,
            code=code, exams=_exams(descriptor), city=city_match.group(),
            studyForm=study_match.group(), budgetSeats=seats[0],
            paidSeats=seats[1], budgetPassingScore=scores[0],
            paidPassingScore=scores[1], sourceUrl=source_url,
        ))
    if not valid:
        quarantined.append({"reason": "MAI parser returned no validated programs"})
    return valid, quarantined
