# Robust Collision Detection (Interval-Based)

The current scheduler logic only prevents collisions for courses that share the exact same start time. We will upgrade the backend to perform full interval overlap checking, ensuring that long-duration courses (e.g., 120m) correctly block their resources for the entire duration.

## Proposed Changes

### 1. Time Utility Helper
We will add a `time_to_mins` helper function in the backend to convert "HH:MM" strings into integer minutes for reliable comparison.

### 2. Overlap Formula
We will implement the standard interval overlap check:
Two courses overlap if `(Start1 < End2) AND (Start2 < End1)`.

### 3. Collision Logic Refactoring
The collision check in `create_schedule_entry` and `update_schedule_entry` will be updated:
- Instead of filtering by `start_time == start_time`, we will fetch all existing entries for the same **resource** (doctor/room) and **day**.
- We will then loop through these entries in Python to check if any of them overlap with the proposed time interval.

## Affected Files

### [MODIFY] [scheduler.py](file:///d:/Projects/Capstone%20-%20CORS/backend/api/app/api/routers/scheduler.py)
- Add `time_to_mins` helper.
- Update conflict detection blocks in POST and PATCH endpoints.

## Open Questions

- **Inclusive Bounds**: Should we allow a course to start exactly when another ends? (e.g., 8:00–9:00 and 9:00–10:00). 
  - Standard academic scheduling usually allows this. The formula `S1 < End2 AND S2 < End1` correctly handles this (non-inclusive of the end boundary).

## Verification Plan

### Manual Verification
- Re-run the user's scenarios:
  - Add Course A (8:00, 120m).
  - Attempt to add Course B (9:00, 60m) with the same instructor. **Expected: Failure.**
  - Attempt to add Course C (9:00, 60m) in the same room. **Expected: Failure.**
  - Attempt to add Course D (10:00, 60m). **Expected: Success.**
