import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getRepository } from "@/src/content/repository";
import { Kopf, Seite } from "@/src/components/ui/Rahmen";

export default function Startseite() {
  const kunden = getRepository().getKunden();
  return (
    <Seite kopf={<Kopf titel="Exakt-Service Navigator" unterzeile="Kunde wählen" />}>
      <div className="space-y-2">
        {kunden.map((k) => (
          <Link
            key={k.id}
            href={`/${k.id}`}
            className="flex min-h-16 items-center gap-3 rounded-xl border border-rand bg-karte px-4 text-lg font-semibold hover:bg-flaeche"
          >
            <span className="flex-1">{k.name}</span>
            <ChevronRight className="size-5 text-text-leise" aria-hidden />
          </Link>
        ))}
      </div>
    </Seite>
  );
}
