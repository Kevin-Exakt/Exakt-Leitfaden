import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getRepository } from "@/src/content/repository";
import { Kopf, Seite } from "@/src/components/ui/Rahmen";
import { Schnellsuche } from "@/src/components/techniker/Schnellsuche";

export default function Startseite() {
  const repo = getRepository();
  const auftraggeber = repo.getAlleAuftraggeber();
  return (
    <Seite kopf={<Kopf titel="Exakt-Service Navigator" unterzeile="Suchen oder Auftraggeber wählen" />}>
      <Schnellsuche index={repo.getSuchindex()} />
      <div className="space-y-2">
        <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-text-leise">Auftraggeber</h2>
        {auftraggeber.map((k) => (
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
