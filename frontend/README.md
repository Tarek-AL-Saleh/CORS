# CORS — Course Offering Recommendation System

An AI-powered decision support tool for university registrars, built with Vite + React + TypeScript + Tailwind CSS.

## 🗂 Project Structure

```
cors-app/
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx              # React entry point
    ├── App.tsx               # Root shell with layout
    ├── index.css             # Tailwind imports + global styles
    │
    ├── types/
    │   └── index.ts          # All shared TypeScript interfaces
    │
    ├── data/
    │   └── mockData.ts       # All mock data in one place
    │
    ├── hooks/
    │   └── useNavigation.ts  # Navigation state hook
    │
    ├── components/
    │   ├── layout/
    │   │   └── Sidebar.tsx           # Permanent sidebar nav
    │   ├── ui/
    │   │   ├── CircularProgress.tsx  # SVG ring progress
    │   │   ├── DemandBadge.tsx       # High / Medium / Low badge
    │   │   ├── KPICard.tsx           # Dashboard KPI card
    │   │   └── FailRatioBar.tsx      # Inline progress + colored %
    │   └── charts/
    │       ├── EnrollmentBarChart.tsx
    │       └── DeptPieChart.tsx
    │
    └── pages/
        ├── Dashboard.tsx             # Overview + KPIs + charts
        ├── DataManagement.tsx        # File upload + data preview
        ├── RecommendationEngine.tsx  # Filters + prediction grid
        └── PrerequisiteGraph.tsx     # SVG dependency graph
```

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Open http://localhost:5173
```

## 🏗 Build for Production

```bash
npm run build
npm run preview
```

## 🧑‍💻 Tech Stack

| Tool | Version |
|------|---------|
| React | 18 |
| TypeScript | 5 |
| Vite | 5 |
| Tailwind CSS | 3 |
| Lucide React | 0.263 |

## 📄 Pages

| Page | Description |
|------|-------------|
| **Dashboard** | KPI cards, enrollment bar chart, department pie chart |
| **Data Management** | Drag-and-drop file upload, grade records preview table |
| **Recommendation Engine** | Scenario filters, course predictions with AI reasoning popovers |
| **Prerequisite Graph** | Interactive SVG node-link diagram with bottleneck detection |
