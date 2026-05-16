import { createRoot } from "react-dom/client";
import { getSimHarnessEntry, simRegistry } from "./registry.js";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("Missing #root element.");
}

const params = new URLSearchParams(window.location.search);
const simId = params.get("sim");
const entry = simId === null ? null : getSimHarnessEntry(simId);

const SimHarnessApp = () => {
  if (entry !== null) {
    const Sim = entry.Component;
    return (
      <article>
        <h1>{entry.title}</h1>
        <Sim />
      </article>
    );
  }

  return (
    <article>
      <h1>Paideia sim harness</h1>
      <p>Select a registered sim by passing its id as the sim query parameter.</p>
      <ul>
        {Object.values(simRegistry).map((candidate) => (
          <li key={candidate.id}>{candidate.id}</li>
        ))}
      </ul>
    </article>
  );
};

createRoot(root).render(<SimHarnessApp />);
