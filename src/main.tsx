import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Error handling for React rendering
const container = document.getElementById("root");

if (!container) {
  console.error("Failed to find the root element");
} else {
  try {
    const root = createRoot(container);
    root.render(<App />);
    console.log("React app successfully mounted");
  } catch (error) {
    console.error("Error rendering the React application:", error);
  }
}
