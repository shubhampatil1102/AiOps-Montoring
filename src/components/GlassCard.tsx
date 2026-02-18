import { useTheme } from "../themeContext";

export default function GlassCard({ children, style }: any) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        width: "100%",
        background: theme.glass,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: `1px solid ${theme.glassBorder}`,
        borderRadius: 18,
        boxShadow: theme.cardShadow,
        padding: 18,
        ...style
      }}
    >
      {children}
    </div>
  );
}
