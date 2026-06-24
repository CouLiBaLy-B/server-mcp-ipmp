from projeqtor_mcp_server.filters import project_items


def test_project_drops_unknown_fields() -> None:
    rows = [{"id": "1", "name": "P", "internalAclId": 99, "wbsSortable": "0001"}]
    assert project_items("Project", rows) == [{"id": "1", "name": "P"}]


def test_activity_rounds_work_fields_in_days() -> None:
    rows = [{"id": "1", "name": "A", "realWork": 1.2000000000000002, "plannedWork": "3"}]
    out = project_items("Activity", rows)
    assert out == [{"id": "1", "name": "A", "realWork": 1.2, "plannedWork": 3.0}]


def test_missing_kept_fields_are_not_injected_as_null() -> None:
    out = project_items("Activity", [{"id": "1"}])
    assert out == [{"id": "1"}]


def test_items_envelope_is_projected_in_place() -> None:
    payload = {"total": 1, "items": [{"id": "1", "name": "T", "junk": 1}]}
    assert project_items("Ticket", payload) == {"total": 1, "items": [{"id": "1", "name": "T"}]}


def test_error_payload_passes_through() -> None:
    err = {"error": "boom"}
    assert project_items("Ticket", err) is err


def test_unknown_class_passes_through_unchanged() -> None:
    rows = [{"id": "1", "anything": True}]
    assert project_items("Budget", rows) is rows


def test_tracker_classes_use_generic_projection() -> None:
    rows = [{"id": "1", "name": "R", "description": "long text", "reference": "RSK-1"}]
    assert project_items("Risk", rows) == [{"id": "1", "name": "R", "reference": "RSK-1"}]
