# Bottleneck Detection Algorithm Refinement

The user has identified that too many courses are being flagged as "systemic bottlenecks." Currently, the algorithm uses a simple "in-degree" count (how many courses immediately require a course as a prerequisite) with a low threshold (3+). This flags many courses that aren't necessarily critical "stoppers" for degree progression.

## Current Algorithm
- **Bottleneck Score**: Number of courses that list the course as an immediate prerequisite.
- **Latent Demand**: Number of students who passed all prerequisites for the course in the last two terms.
- **Frontend Flag**: `score > 3` OR `demand > 20`.

## Proposed Algorithm: Downstream Impact Factor (DIF)
To make the analysis truly "systemic," we will shift from immediate prerequisites to **Recursive Downstream Impact**.

### 1. Transitive Closure
Instead of counting immediate children, we will count the total number of courses in the entire future path that are blocked if this course is not offered.
- *Example*: CSC243 -> CSC245 -> CSC310 -> CSC490.
- Under the current system, CSC243 score = 1.
- Under the new system, CSC243 score = 3 (it blocks 245, 310, and 490).

### 2. Weighted Importance
Higher-level courses (400+) are closer to graduation. We can weigh the score based on the "depth" of the dependency.

### 3. Dynamic Thresholding
Instead of a hardcoded `> 3`, we will use a percentile-based approach or a much higher threshold (e.g., `> 10`) to isolate only the top critical paths.

## Proposed Changes

### [Backend] [Feature Transformer](file:///d:/Projects/Capstone%20-%20CORS/backend/api/app/services/ml_feature_transformer.py)
#### [MODIFY] `_calc_bottleneck_score`
- Implement a recursive search (DFS or pre-computed adjacency list) to calculate the total size of the downstream dependency tree for each course.
- This will provide a true "Systemic Flow" analysis.

### [Frontend] [Prerequisite Graph](file:///d:/Projects/Capstone%20-%20CORS/frontend/src/pages/PrerequisiteGraph.tsx)
#### [MODIFY] Bottleneck Logic
- Update the threshold from `> 3` to a higher value (suggested: `> 10`).
- Update the labels in the UI to reflect that this is now "Recursive Downstream Pressure."

## Open Questions

- **Threshold Tuning**: Does a threshold of **10+ blocked courses** sound like a reasonable definition for a "Systemic Bottleneck" to you? Or would you prefer a top-N approach (e.g., only show the top 15 most critical courses)?
- **Latent Demand**: Should we still flag courses with high student demand (> 20) regardless of the graph, or should we keep the bottleneck alert focused strictly on the prerequisite graph?

## Verification Plan

### Manual Verification
- Run the prediction bulk engine to regenerate scores.
- View the "Prerequisite Topology" page.
- Verify that common but less critical courses are removed from the alert box.
- Verify that "Core" prerequisites (like CSC245 or MTH201) are still correctly identified.
