import { createContext, useContext, useState } from "react";
import { themes } from "./theme";

const ThemeContext = createContext<any>(null);

export function ThemeProvider({ children }: any) {
  const [themeName, setThemeName] = useState("lightGreen");

  const toggle = () => {
    setThemeName(prev => prev === "lightGreen" ? "dark" : "lightGreen");
  };

  return (
    <ThemeContext.Provider value={{ theme: themes[themeName], toggle }}>
      <div style={{ background: themes[themeName].bg, minHeight: "100vh" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
