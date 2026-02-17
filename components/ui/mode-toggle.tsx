"use client"

type Mode = "technology" | "local"

export default function ModeToggle({
  mode,
  setMode,
}: {
  mode: Mode
  setMode: (m: Mode) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`text-sm ${
          mode === "technology" ? "font-semibold text-black" : "text-gray-500"
        }`}
      >
        Technology Mode
      </span>

      <button
        onClick={() => setMode(mode === "technology" ? "local" : "technology")}
        className={`relative w-14 h-7 rounded-full transition ${
          mode === "local" ? "bg-black" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
            mode === "local" ? "translate-x-7" : "translate-x-0"
          }`}
        />
      </button>

      <span
        className={`text-sm ${
          mode === "local" ? "font-semibold text-black" : "text-gray-500"
        }`}
      >
        Local Mode
      </span>
    </div>
  )
}