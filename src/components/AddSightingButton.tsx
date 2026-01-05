import { useState } from "react";
import AddSighting from "./AddSighting";

export default function AddSightingButton() {
  const [open, setOpen] = useState(false);

  // Keyboard handler for closing dialog
  const handleDialogKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") setOpen(false);
    if (e.key === "Enter" || e.key === " ") e.stopPropagation();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000 }}
        aria-label="Add sighting"
      >
        +
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.3)",
            zIndex: 1001,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setOpen(false)}
          onKeyDown={handleDialogKeyDown}
        >
          <div
            role="document"
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 8,
              minWidth: 320,
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
          >
            <AddSighting onSubmit={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
