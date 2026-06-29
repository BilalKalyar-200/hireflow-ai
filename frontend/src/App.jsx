/**
 * HireFlow AI — Root React Component.
 * App shell with header and dashboard page.
 */

import Dashboard from "./pages/Dashboard";

/**
 * App — top-level layout with branded header.

 * Input: none
 * Output: full application JSX tree
 */
export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>HireFlow AI</h1>
          <div className="tagline">
            Autonomous AI agents that screen, score, and schedule so hiring runs itself.
          </div>
        </div>
        <div className="header-status">
          <span>Global AI Hackathon · Track 4 Autopilot Agent</span>
        </div>
      </header>

      <main className="dashboard">
        <Dashboard />
      </main>
    </div>
  );
}
