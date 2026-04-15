# Streamlined Course Management

We will optimize the UX for editing and deleting courses by moving these actions directly into the `CourseLot` dropdown and ensuring the dropdown remains persistent during interaction.

## Proposed Changes

### 1. `CourseLot.tsx` Refactoring
- **Persistence**: Remove the `setIsExpanded(false)` call from the course selection handler. The dropdown will now stay open until the user clicks outside or manually closes it.
- **In-Place Actions**:
  - Replace the single `ChevronRight` arrow with two smaller, stacked buttons:
    - **Edit (Pencil Icon)**: Opens the "Entity Particulars" side drawer.
    - **Delete (Trash Icon)**: Triggers the deletion flow.
  - Buttons will be styled to be distinct but compact.

### 2. Action Piping
- **Deletion Logic**: Add `onDeleteEntry` prop to `CourseLot` and `TimetableGrid`.
- **State Synchronization**: `Scheduler.tsx` will provide the `handleDelete` callback to the grid.

## Affected Files

### [MODIFY] [CourseLot.tsx](file:///d:/Projects/Capstone%20-%20CORS/frontend/src/components/scheduler/CourseLot.tsx)
- Add `onDeleteClick` prop.
- Redesign the item action area with `Edit` and `Delete` icons.
- Update click handlers for persistence.

### [MODIFY] [TimetableGrid.tsx](file:///d:/Projects/Capstone%20-%20CORS/frontend/src/components/scheduler/TimetableGrid.tsx)
- Forward `onDeleteEntry` to `CourseLot`.

### [MODIFY] [Scheduler.tsx](file:///d:/Projects/Capstone%20-%20CORS/frontend/src/pages/Scheduler.tsx)
- Pass the existing delete logic to `TimetableGrid`.

## Open Questions
- **Delete Confirmation**: Should we prompt for confirmation when the trash icon is clicked in the dropdown, or just delete immediately (since there is no "undo")? (I recommend a quick native `window.confirm` or a subtle UI confirmation state).

## Verification Plan
- Open a lot dropdown.
- Click "Edit" and verify the drawer opens while the dropdown stays visible.
- Click "Delete" and verify the course is removed from the grid.
- Verify clicking outside still closes the dropdown.
