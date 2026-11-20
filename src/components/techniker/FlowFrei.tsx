"use client";
import { RotateCcw } from "lucide-react";
import { useState } from "react";
import type { Flow } from "@/src/content/schema";
import { antworten, korrigieren, stand, zurueck, type Verlauf } from "@/src/engine/run";
import { Button } from "../ui/Button";
import { FlowAnsicht } from "./FlowAnsicht";

/** Ablauf ohne Einsatz durchklicken (Nachschlagen). Nichts wird gespeichert. */
export function FlowFrei({ flow, namen }: { flow: Flow; namen: Record<string, string> }) {
  const [verlauf, setVerlauf] = useState<Verlauf>([]);
  const [bestaetigt, setBestaetigt] = useState<Record<string, string[]>>({});
  const knotenId = stand(flow, verlauf).knoten.id;
  const punkte = bestaetigt[knotenId] ?? [];

  return (
    <FlowAnsicht
      flow={flow}
      verlauf={verlauf}
      namen={namen}
      bestaetigt={punkte}
      onBestaetigung={(p) =>
        setBestaetigt({ ...bestaetigt, [knotenId]: punkte.includes(p) ? punkte.filter((x) => x !== p) : [...punkte, p] })
      }
      onAntwort={(id) => setVerlauf(antworten(flow, verlauf, id, { bestaetigt: true }))}
      onZurueck={() => setVerlauf(zurueck(verlauf))}
      onKorrigieren={(i) => setVerlauf(korrigieren(verlauf, i))}
      ergebnisAktionen={
        <Button
          variante="primaer"
          breit
          icon={<RotateCcw className="size-5" />}
          onClick={() => {
            setVerlauf([]);
            setBestaetigt({});
          }}
        >
          Von vorne beginnen
        </Button>
      }
    />
  );
}
