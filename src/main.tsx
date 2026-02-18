import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";


import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./themeContext";

const client = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <ThemeProvider>
      <App />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
