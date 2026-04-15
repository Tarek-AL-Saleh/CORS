# Institutional Schedule Export (Excel)

This plan implements the "Finalize & Export" feature, allowing users to download the full academic schedule as a professional Excel spreadsheet.

## User Review Required

> [!NOTE]
> **Data Format**: I will include all key fields in the export: Course Code, Section Name, Assigned Faculty, Day, Start Time, Duration, and Room. If a course is unassigned, it will explicitly show "Unassigned" in the Faculty column.

## Proposed Changes

### 🐍 Backend (`scheduler.py`)
- **New Endpoint**: `GET /api/scheduler/export`
- **Implementation**:
    - Use `pandas` and `openpyxl` to generate a formatted `.xlsx` file in memory.
    - Include a custom header row for institutional branding.
    - Return the file as a `StreamingResponse` with appropriate MIME types for direct browser download.

### 🌐 Frontend (`services/api.ts`)
- **API Wrapper**: Add a helper method to handle the authenticated download request if needed, though a direct `window.open` is often cleaner for simple exports.

### 🎨 Frontend (`pages/Scheduler.tsx`)
- **Button Action**: Link the "Finalize & Export" button to the new backend endpoint.
- **Feedback**: Add a brief "Generating Report..." state if the export takes more than a few seconds.

## Affected Files

### [MODIFY] [scheduler.py](file:///d:/Projects/Capstone%20-%20CORS/backend/api/app/api/routers/scheduler.py)
- Import `pandas` and `BytesIO`.
- Add the `@router.get("/export")` handler.

### [MODIFY] [Scheduler.tsx](file:///d:/Projects/Capstone%20-%20CORS/frontend/src/pages/Scheduler.tsx)
- Add `handleExport` function.
- Update the "Finalize & Export" button `onClick`.

## Verification Plan

### Manual Verification
1. **Export Trigger**:
   - Click the "Finalize & Export" button.
   - **Expected**: A file named `final_schedule.xlsx` starts downloading.
2. **File Integrity**:
   - Open the downloaded Excel file.
   - **Expected**: A clean table with all current grid data, correctly mapped faculty names (no IDs), and proper column headers.
