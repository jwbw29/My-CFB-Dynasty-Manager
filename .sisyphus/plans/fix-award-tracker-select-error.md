# Fix Award Tracker Select Empty String Error

## TL;DR

> **Quick Summary**: Fix Radix UI Select error by converting `undefined` to empty string in the Team select component.
> 
> **Deliverables**:
> - One-character fix in `AwardTracker.tsx` (line 302)
> 
> **Estimated Effort**: Quick (1-2 minutes)
> **Parallel Execution**: NO - single task
> **Critical Path**: Task 1 only

---

## Context

### Original Request
User encountered random error when accessing Player Awards page:
```
Error: A <Select.Item /> must have a value prop that is not an empty string.
This is because the Select value can be set to an empty string to clear the
selection and show the placeholder.
```

### Root Cause
The "Team" Select component (lines 300-314 in `AwardTracker.tsx`) uses `selectedTeam` state which can be `undefined`. When React/Radix coerces `undefined` to an empty string, it violates Radix UI's constraint that SelectItem values cannot be empty strings.

The error appears when:
1. Page loads → `selectedTeam` is `undefined`
2. User selects a team award (All-American/All-Conference)
3. Team select renders with `value={undefined}` → coerced to `""` → ERROR

---

## Work Objectives

### Core Objective
Fix the Select component to handle `undefined` state gracefully by explicitly converting to empty string.

### Concrete Deliverables
- Modified `src/components/AwardTracker.tsx` line 302

### Definition of Done
- [ ] `npm run dev` starts without errors
- [ ] Awards page loads without Select error
- [ ] User can select team awards (All-American/All-Conference) and pick team (1st/2nd/Freshman)
- [ ] Form validation still works (requires team selection for team awards)

### Must Have
- One-character change: `value={selectedTeam}` → `value={selectedTeam || ""}`

### Must NOT Have (Guardrails)
- Do NOT change TypeScript types (keep `undefined` in type union)
- Do NOT modify validation logic (line 144)
- Do NOT change state initialization (line 96-98)
- Do NOT add placeholder SelectItem with empty value

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (npm scripts available)
- **Automated tests**: None (manual QA only)
- **Framework**: N/A

### QA Policy
Task includes agent-executed QA scenarios using Playwright for browser verification.
Evidence saved to `.sisyphus/evidence/task-1-*.png`.

---

## Execution Strategy

### Single Task Execution
No parallelization needed - one file, one line change.

---

## TODOs

- [x] 1. Fix Select Component Empty String Error

  **What to do**:
  - Open `src/components/AwardTracker.tsx`
  - Navigate to line 302 (inside the `isTeamAwardSelected` conditional block)
  - Change `value={selectedTeam}` to `value={selectedTeam || ""}`
  - Save the file

  **Must NOT do**:
  - Do NOT change the TypeScript type definition for `selectedTeam` (line 96-98)
  - Do NOT modify the validation logic at line 144
  - Do NOT add a SelectItem with `value=""`
  - Do NOT change state initialization

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-line fix in one file, clear requirement, minimal complexity
  - **Skills**: None needed
    - Reason: Straightforward code edit with no special tooling required

  **Parallelization**:
  - **Can Run In Parallel**: NO (only one task)
  - **Parallel Group**: Sequential
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/components/AwardTracker.tsx:300-314` - The Team select block to modify
  - `src/components/AwardTracker.tsx:96-98` - State definition (DO NOT modify)
  - `src/components/AwardTracker.tsx:144-147` - Validation logic (keep intact)

  **API/Type References**:
  - Radix UI Select constraint: SelectItem `value` prop cannot be empty string
  - React behavior: `undefined` props are coerced to empty string in JSX

  **Why Each Reference Matters**:
  - Lines 300-314: Contains the exact Select component causing the error
  - Lines 96-98: Shows why `selectedTeam` can be `undefined` - important to understand context
  - Lines 144-147: Validation still works because empty string is falsy (`!selectedTeam` check)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Awards page loads without Select error
    Tool: Playwright (dev-browser skill)
    Preconditions: 
      - Development server running on localhost:3001
      - Clean browser state (no previous errors)
    Steps:
      1. Navigate to http://localhost:3001/awards
      2. Wait for page to fully load (timeout: 10s)
      3. Assert: No error messages in console matching "Select.Item.*empty string"
      4. Assert: Page title contains "Award Tracker"
      5. Screenshot: Full page
    Expected Result: Page loads successfully without Select error
    Failure Indicators: Console error about SelectItem, page crash, blank screen
    Evidence: .sisyphus/evidence/task-1-page-load.png

  Scenario: Team award selection works correctly
    Tool: Playwright (dev-browser skill)
    Preconditions:
      - Awards page loaded (from previous scenario)
      - No award currently selected
    Steps:
      1. Click Select with placeholder "Select Award"
      2. Click option with text "All-American"
      3. Wait 1s for Team select to appear
      4. Assert: Team select visible (selector: 'button:has-text("Select Team")')
      5. Click Team select
      6. Click option with text "1st Team"
      7. Assert: Team select shows "1st Team"
      8. Screenshot: Form with selections
    Expected Result: Team select appears and accepts selection without error
    Failure Indicators: Team select not appearing, error on team selection, crash
    Evidence: .sisyphus/evidence/task-1-team-selection.png

  Scenario: Form validation still requires team for team awards
    Tool: Playwright (dev-browser skill)
    Preconditions:
      - Awards page loaded
      - Player selected in player dropdown
      - "All-Conference" selected as award
      - Team NOT selected
    Steps:
      1. Fill player select with first available player
      2. Fill award select with "All-Conference"
      3. Click "Add Award" button
      4. Wait 500ms for toast notification
      5. Assert: Toast error contains "Please select a team"
      6. Screenshot: Error state
    Expected Result: Validation error displayed, award NOT added
    Failure Indicators: Award added without team, no validation error, crash
    Evidence: .sisyphus/evidence/task-1-validation.png
  ```

  **Evidence to Capture**:
  - [ ] task-1-page-load.png - Clean page load without errors
  - [ ] task-1-team-selection.png - Team select working
  - [ ] task-1-validation.png - Validation still enforced

  **Commit**: YES
  - Message: `fix(awards): Convert undefined to empty string in Team select`
  - Files: `src/components/AwardTracker.tsx`
  - Pre-commit: `npm run dev` (verify no build errors)

---

## Final Verification Wave

Not needed for single quick fix. QA scenarios in Task 1 are sufficient.

---

## Commit Strategy

- **Single commit**: `fix(awards): Convert undefined to empty string in Team select`
  - Files: `src/components/AwardTracker.tsx`
  - Verify: `npm run dev` starts successfully

---

## Success Criteria

### Verification Commands
```bash
npm run dev  # Expected: Server starts on port 3001 without errors
```

### Manual Verification
1. Navigate to http://localhost:3001/awards
2. Select "All-American" award
3. Team select appears without error
4. Can select "1st Team", "2nd Team", or "Freshman"
5. Validation still requires team selection for team awards

### Final Checklist
- [ ] No console errors about SelectItem empty string
- [ ] Team select appears when team award selected
- [ ] Form validation still works
- [ ] Awards can be added successfully
