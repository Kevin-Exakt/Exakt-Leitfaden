"use client";
import { Check, Copy, Phone, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/Button";

/** Kurzbericht zum Vorlesen, Kopieren oder Teilen mit dem Innendienst. */
export function Zusammenfassung({ text, titel = "Zusammenfassung für den Innendienst" }: { text: string; titel?: string }) {
  const [kopiert, setKopiert] = useState(false);
  const teilenMoeglich = typeof navigator !== "undefined" && "share" in navigator;

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(text);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2000);
    } catch {
      // Zwischenablage nicht verfügbar – Text bleibt sichtbar zum Vorlesen.
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-blue-200 bg-info-hell p-4">
      <p className="flex items-center gap-2 font-semibold text-blue-950">
        <Phone className="size-5 text-info" aria-hidden /> {titel}
      </p>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 font-sans text-sm leading-relaxed">
        {text}
      </pre>
      <div className="grid grid-cols-2 gap-2">
        <Button gross={false} onClick={kopieren} icon={kopiert ? <Check className="size-4" /> : <Copy className="size-4" />}>
          {kopiert ? "Kopiert" : "Kopieren"}
        </Button>
        {teilenMoeglich && (
          <Button
            gross={false}
            icon={<Share2 className="size-4" />}
            onClick={() => navigator.share({ text }).catch(() => undefined)}
          >
            Teilen
          </Button>
        )}
      </div>
    </div>
  );
}
