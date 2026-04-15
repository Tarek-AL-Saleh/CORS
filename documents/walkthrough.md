# Development Walkthrough

All requested features and fixes have been successfully implemented! Here's a breakdown of the changes made and how they address your specific requirements.

## 1. 2-Step Authentication Verification

A secure authentication mechanism has been integrated, successfully locking down the application.
- **Login Interface**: A premium `LoginPage` aesthetic was built matching the CORS application. 
- **The Flow**: 
  1. The user logs in with their username and password. 
  2. The backend validates credentials and generates a 6-digit verification code. This code is mocked and printed to the backend server's terminal (simulating an email send to the academic address).
  3. The frontend shifts to step 2, prompting for the code. Upon inputting the correct code, the server issues an HTTPOnly secure generic JWT cookie spanning 60 mins exactly, preventing session fatigue for chairpersons while maintaining tight security.
- **Auto-Bootstrapping**: When the backend starts up, we now check for an `admin` user. If the users table is completely empty, it automatically creates the hardcoded default user (`admin` / `admin` / `admin@university.edu`).

## 2. Prerequisite Graph Decluttering

The React Flow module has been significantly enhanced:
- **Graph Filtration Pass**: The backend API (`/graph`) now runs a pre-computation to identify all nodes participating in either an incoming or outgoing prerequisite constraint.
- **Refined Display**: Any isolated courses completely detached from the node network are filtered out entirely! This massively drops the node count from hundreds down to only the structurally relevant dependency chains, guaranteeing high readability without manual panning/zooming.
- **Bottlenecks**: Isolated courses are inherently no longer tagged as critical network bottlenecks.

## 3. Scheduler Row Layout Overhaul

The institutional grid scaling logic has been rewritten to accommodate multiple overlapping courses seamlessly!
- **Vertical Row Stacking Algorithm**: Previously, multiple courses placed logically at the same time slot would overlap completely, obscuring information. Slicing them into tiny vertical columns made name readability impossible.
- Now, when `n` courses operate concurrently, the grid calculates a dynamically height-distributed mini-stack. They wrap entirely inside the row boundaries, occupying 100% full width to guarantee the title strings maintain legibility.
- Visual bounds respect strict text-overflow, eliminating vertical clipping while ensuring all overlapping activities can be clicked and interacted with directly.

> [!TIP]
> Ensure you run `pip install pyjwt passlib bcrypt` across your development environment to guarantee the cryptographic libraries exist on your system before proceeding!
