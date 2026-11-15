"""Source-aware, pure EGE eligibility rules shared by search and route."""
from __future__ import annotations
from typing import Any

SUBJECTS = {
    "russian": "русский язык", "русский": "русский язык", "русский язык": "русский язык",
    "math": "математика", "mathematics": "математика", "математика": "математика",
    "informatics": "информатика", "computer_science": "информатика", "информатика": "информатика",
    "physics": "физика", "физика": "физика", "chemistry": "химия", "химия": "химия",
    "biology": "биология", "биология": "биология", "social": "обществознание",
    "social_studies": "обществознание", "обществознание": "обществознание",
    "history": "история", "история": "история", "literature": "литература",
    "литература": "литература", "foreign": "иностранный язык",
    "foreign_language": "иностранный язык", "иностранный язык": "иностранный язык",
}


def normalized_scores(raw: Any) -> dict[str, int]:
    if not isinstance(raw, dict):
        return {}
    output: dict[str, int] = {}
    for key, value in raw.items():
        if not isinstance(key, str) or isinstance(value, bool):
            continue
        subject = SUBJECTS.get(key.strip().lower(), key.strip().lower())
        try:
            number = float(value)
        except (ValueError, TypeError, OverflowError):
            continue
        if not subject or not number.is_integer() or not 0 <= number <= 100:
            continue
        output[subject] = int(number)
    return output


def score_program(requirements: list[dict[str, Any]], scores: dict[str, int]) -> tuple[bool, int | None]:
    """Fail closed for non-EGE-only programs. Such routes require separate rules."""
    ege = [r for r in requirements if r.get("exam_kind") == "ege"]
    if not ege:
        return False, None
    mandatory = [r for r in ege if r.get("choice_group") is None]
    grouped: dict[int, list[dict[str, Any]]] = {}
    for rule in ege:
        if rule.get("choice_group") is not None:
            grouped.setdefault(int(rule["choice_group"]), []).append(rule)
    total = 0
    for rule in mandatory:
        value = scores.get(rule["subject"])
        if value is None or (rule.get("min_score") is not None and value < rule["min_score"]):
            return False, None
        total += value
    for alternatives in grouped.values():
        valid = [
            scores[r["subject"]] for r in alternatives
            if r["subject"] in scores
            and (r.get("min_score") is None or scores[r["subject"]] >= r["min_score"])
        ]
        if not valid:
            return False, None
        total += max(valid)
    return True, total


def score_band(score: int | None, cutoff: int | None, ambitious_gap: int = 20) -> tuple[str, int | None]:
    if score is None:
        return "not_requested", None
    if cutoff is None:
        return "no_history", None
    gap = score - cutoff
    if gap >= 15:
        return "safe", gap
    if gap >= 0:
        return "realistic", gap
    if gap >= -ambitious_gap:
        return "ambitious", gap
    return "below", gap
