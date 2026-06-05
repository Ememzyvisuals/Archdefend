import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "ArchDefend";
  const subtitle = searchParams.get("subtitle") || "Architecture Intelligence For Real Engineering Teams";
  const type = searchParams.get("type") || "default";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0a0a",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />

        {/* Gradient overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.18) 0%, transparent 65%)",
        }} />

        {/* Content */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "60px 80px", position: "relative",
        }}>
          {/* Shield icon */}
          <div style={{
            width: 72, height: 72, marginBottom: 28,
            background: "rgba(99,102,241,0.15)",
            border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="36" height="36" viewBox="0 0 100 100" fill="none">
              <path d="M50 5L90 22V52C90 72 72 87 50 97C28 87 10 72 10 52V22L50 5Z" stroke="url(#g1)" strokeWidth="6" fill="none" strokeLinejoin="round" />
              <circle cx="50" cy="52" r="7" fill="#22d3ee" />
              <circle cx="30" cy="42" r="4" fill="#22d3ee" opacity="0.8" />
              <circle cx="70" cy="42" r="4" fill="#22d3ee" opacity="0.8" />
              <circle cx="30" cy="62" r="4" fill="#22d3ee" opacity="0.8" />
              <circle cx="70" cy="62" r="4" fill="#22d3ee" opacity="0.8" />
              <line x1="50" y1="52" x2="30" y2="42" stroke="#22d3ee" strokeWidth="1.5" />
              <line x1="50" y1="52" x2="70" y2="42" stroke="#22d3ee" strokeWidth="1.5" />
              <line x1="50" y1="52" x2="30" y2="62" stroke="#22d3ee" strokeWidth="1.5" />
              <line x1="50" y1="52" x2="70" y2="62" stroke="#22d3ee" strokeWidth="1.5" />
              <defs>
                <linearGradient id="g1" x1="10" y1="5" x2="90" y2="97">
                  <stop stopColor="#7c3aed" /><stop offset="1" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Title */}
          <div style={{
            fontSize: title.length > 30 ? 42 : 56,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            marginBottom: 20,
            maxWidth: 900,
          }}>
            {title}
          </div>

          {/* Subtitle */}
          <div style={{
            fontSize: 22,
            color: "rgba(255,255,255,0.4)",
            textAlign: "center",
            maxWidth: 680,
            lineHeight: 1.4,
          }}>
            {subtitle}
          </div>

          {/* Tech badges */}
          {type === "default" && (
            <div style={{ display: "flex", gap: 12, marginTop: 36 }}>
              {["GitHub", "Tree-sitter", "NetworkX", "Groq AI", "React Flow"].map((tech) => (
                <div key={tech} style={{
                  padding: "6px 14px", borderRadius: 20,
                  background: "rgba(99,102,241,0.1)",
                  border: "1px solid rgba(99,102,241,0.25)",
                  color: "#a5b4fc", fontSize: 14, fontWeight: 500,
                }}>
                  {tech}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 60px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "rgba(99,102,241,0.2)",
              border: "1px solid rgba(99,102,241,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 16, height: 16, background: "#6366f1", borderRadius: 3 }} />
            </div>
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 18, fontWeight: 700 }}>ArchDefend</span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 14 }}>Built by Ememzyvisuals</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
