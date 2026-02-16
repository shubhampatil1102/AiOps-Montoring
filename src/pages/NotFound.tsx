export default function NotFound() {
  return (
    <div style={{
      height: "80vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      gap: 10
    }}>
      
      <h1 style={{ fontSize: 80, margin: 1, color: "#fd3a3a"}}>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you are looking for does not exist.</p>
      <a href="/" className="text-primary underline hover:text-primary/90">
          <b style={{
            color: "#0a0b0b",
            cursor: "pointer"
          }}>Return to Home</b>
        </a>
    </div>
  );
}
