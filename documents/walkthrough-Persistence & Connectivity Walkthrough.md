# Persistence & Connectivity Walkthrough

I've resolved the critical data loss and network issues in the CORS Scheduler.

## Changes

### 1. Data Persistence (Faculty Names)
- **Nested Serialization**: Updated the backend response schemas to include the `doctor` object.
- **Eager Loading**: Implemented `joinedload` in the scheduler API to ensure faculty names are fetched and persisted across page refreshes and tab switches.

### 2. Connectivity & CORS Fix
- **Harden PATCH Handler**: Fixed a server crash in the `update_schedule_entry` endpoint caused by handling the new `duration_mins` field. Resolving this server error fixed the "Blocked by CORS" issue, as the server now returns valid headers.
- **Duration Support**: Modifications to course durations are now correctly saved to the database.

## Verification Results

### Manual Tests
- **Persistence**: Assigned "Dr. Smith" to a course, refreshed the browser. **Result**: Assignment persisted.
- **Updates**: Changed a Monday course from 60m to 120m. **Result**: Saved successfully with no network errors.
- **Unassignment**: Cleared a doctor's name in the edit form. **Result**: Course correctly reverted to "Unassigned" status.
