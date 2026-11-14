from services.api.rules import normalized_scores, score_band, score_program

REQUIREMENTS = [
    {"subject": "русский язык", "min_score": 50, "choice_group": None, "exam_kind": "ege"},
    {"subject": "математика", "min_score": 60, "choice_group": None, "exam_kind": "ege"},
    {"subject": "информатика", "min_score": 70, "choice_group": 1, "exam_kind": "ege"},
    {"subject": "физика", "min_score": 65, "choice_group": 1, "exam_kind": "ege"},
]


def test_exam_alternatives_and_minimums():
    valid, total = score_program(REQUIREMENTS, normalized_scores({
        "russian": 85, "math": 90, "informatics": 88, "physics": 74,
    }))
    assert valid is True and total == 263
    assert score_program(REQUIREMENTS, {"русский язык": 85, "математика": 50, "информатика": 88})[0] is False
    assert score_program(REQUIREMENTS, {"русский язык": 85, "математика": 90})[0] is False


def test_no_unverified_exam_path():
    assert score_program([{"subject": "internal", "exam_kind": "internal"}], {"математика": 100}) == (False, None)
    assert score_program([], {"математика": 100}) == (False, None)


def test_strict_score_validation():
    assert normalized_scores({"math": 101, "russian": -1, "physics": True, "informatics": "88.5"}) == {}
    assert score_band(260, 250) == ("realistic", 10)
    assert score_band(300, None) == ("no_history", None)
