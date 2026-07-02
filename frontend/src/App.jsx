/**
 * FILE 1 of 7 — App shell with responsive header layout.
 */

import { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";

/**
 * Initialize theme from localStorage or system preference.
 * Input: none
 * Output: "light" or "dark" string
 */
function getInitialTheme() {
  const saved = localStorage.getItem("hireflow-theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * App — responsive header + dashboard.
 * Input: none
 * Output: full application JSX tree
 */
export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("hireflow-theme", theme);
  }, [theme]);

  /**
   * Toggle between light and dark mode.
   * Input: click on theme toggle button
   * Output: switches theme state
   */
  function toggleTheme() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <div className="header-title-row">
            <h1>⚡ HireFlow AI</h1>
          </div>
          <div className="tagline">
            Autonomous AI agents that screen, score, and schedule so hiring runs itself.
          </div>
          <span className="hackathon-badge badge-mobile">
            Global AI Hackathon · Track 4 Autopilot Agent
          </span>
        </div>
        <div className="header-actions">
          <span className="hackathon-badge badge-desktop">
            Global AI Hackathon · Track 4 Autopilot Agent
          </span>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            title={theme === "light" ? "Dark mode" : "Light mode"}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      </header>

      <Dashboard />
    </div>
  );
}
