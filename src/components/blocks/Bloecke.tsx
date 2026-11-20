import Image from "next/image";
import { FileText, Info, OctagonAlert, PlayCircle, TriangleAlert } from "lucide-react";
import type { Block } from "@/src/content/schema";

/** Stellt Inhaltsblöcke (Text, Hinweis, Warnung, Sicherheit, Bild …) einheitlich dar. */
export function Bloecke({ bloecke }: { bloecke: Block[] }) {
  if (!bloecke.length) return null;
  return (
    <div className="space-y-3">
      {bloecke.map((b, i) => (
        <BlockAnzeige key={i} block={b} />
      ))}
    </div>
  );
}

const HINWEIS_STIL = {
  hinweis: { klasse: "border-blue-200 bg-info-hell text-blue-950", icon: Info, farbe: "text-info", name: "Hinweis" },
  warnung: { klasse: "border-orange-300 bg-warnung-hell text-orange-950", icon: TriangleAlert, farbe: "text-warnung", name: "Warnung" },
  sicherheit: { klasse: "border-red-300 bg-sicherheit-hell text-red-950", icon: OctagonAlert, farbe: "text-sicherheit", name: "Sicherheit" },
} as const;

function BlockAnzeige({ block: b }: { block: Block }) {
  switch (b.typ) {
    case "text":
      return <p className="whitespace-pre-line leading-relaxed">{b.text}</p>;

    case "hinweis":
    case "warnung":
    case "sicherheit": {
      const s = HINWEIS_STIL[b.typ];
      const Icon = s.icon;
      return (
        <div role={b.typ === "hinweis" ? "note" : "alert"} className={`flex gap-3 rounded-xl border-2 p-3 ${s.klasse}`}>
          <Icon className={`mt-0.5 size-5 shrink-0 ${s.farbe}`} aria-hidden />
          <div className="space-y-0.5">
            <p className="font-semibold">{b.titel ?? s.name}</p>
            <p className="whitespace-pre-line text-[0.95rem] leading-relaxed">{b.text}</p>
          </div>
        </div>
      );
    }

    case "bild":
      return (
        <figure className="overflow-hidden rounded-xl border border-rand bg-karte">
          <div className="relative aspect-video">
            <Image
              src={b.src}
              alt={b.alt}
              fill
              sizes="(max-width: 640px) 100vw, 640px"
              className="object-contain"
              unoptimized={b.src.endsWith(".svg")}
            />
            {b.beispiel && (
              <span className="absolute left-2 top-2 rounded-md bg-tinte/80 px-2 py-0.5 text-xs font-semibold text-white">
                Beispielbild
              </span>
            )}
          </div>
          {b.beschriftung && <figcaption className="px-3 py-2 text-sm text-text-leise">{b.beschriftung}</figcaption>}
        </figure>
      );

    case "video":
    case "pdf": {
      const Icon = b.typ === "video" ? PlayCircle : FileText;
      return (
        <a
          href={b.src}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-14 items-center gap-3 rounded-xl border border-rand bg-karte px-4 py-3 font-medium hover:bg-flaeche"
        >
          <Icon className="size-6 text-text-leise" aria-hidden />
          <span className="flex-1">{b.titel}</span>
          <span className="text-sm text-text-leise">{b.typ === "video" ? "Video" : "PDF"} öffnen</span>
        </a>
      );
    }

    case "sollwert":
      return (
        <div className="flex items-baseline justify-between rounded-xl border border-rand bg-karte px-4 py-3">
          <span className="text-text-leise">Sollwert · {b.bezeichnung}</span>
          <span className="font-semibold tabular-nums">
            {b.wert}
            {b.einheit && ` ${b.einheit}`}
          </span>
        </div>
      );
  }
}
