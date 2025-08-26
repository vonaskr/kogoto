// src/app/palette/page.tsx
export default function PalettePage() {
  const palettes = [
    {
      name: "① Sui風（未来感）",
      colors: {
        Background: "#F2F6FF",
        Primary: "#3B82F6",
        Accent1: "#FACC15",
        Accent2: "#F43F5E",
        Text: "#0B0F19",
        Card: "#E0F2FE",
      },
    },
    {
      name: "② ポップ（楽しい学習感）",
      colors: {
        Background: "#FFFBE6",
        Primary: "#FF5C8A",
        Secondary: "#00C2FF",
        Accent: "#FFD600",
        Text: "#1A1A1A",
      },
    },
    {
      name: "③ レトロPC風（落ち着き）",
      colors: {
        Background: "#F7F7F2",
        Primary: "#006666",
        Accent: "#FF4D00",
        Highlight: "#FFD700",
        Text: "#000000",
      },
    },
  ];

  return (
    <main className="p-10 space-y-10">
      {palettes.map((palette, idx) => (
        <div key={idx}>
          <h2 className="text-2xl font-bold mb-4">{palette.name}</h2>
          <div className="flex gap-6 flex-wrap">
            {Object.entries(palette.colors).map(([label, hex]) => (
              <div
                key={label}
                className="w-28 h-28 flex flex-col items-center justify-center rounded-lg border"
                style={{ backgroundColor: hex }}
              >
                <span className="text-xs font-bold bg-white/70 px-1 rounded">
                  {label}
                </span>
                <span className="text-[10px] bg-white/70 px-1 rounded mt-1">
                  {hex}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
