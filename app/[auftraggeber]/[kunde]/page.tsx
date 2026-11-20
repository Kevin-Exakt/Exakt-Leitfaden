import { notFound } from "next/navigation";
import { findeKunde, kundenParams } from "@/src/content/navigation";
import { Kopf, Seite } from "@/src/components/ui/Rahmen";
import { SystemAuswahl } from "@/src/components/techniker/VariantenAuswahl";

export function generateStaticParams() {
  return kundenParams();
}

/** Kunde → System und Hersteller wählen. */
export default async function SystemWaehlen({ params }: PageProps<"/[auftraggeber]/[kunde]">) {
  const p = await params;
  const treffer = findeKunde(p.auftraggeber, p.kunde);
  if (!treffer) notFound();
  const { auftraggeber, kunde } = treffer;
  return (
    <Seite
      kopf={
        <Kopf
          titel={auftraggeber.kunden.length === 1 ? auftraggeber.name : `${auftraggeber.name} · ${kunde.name}`}
          unterzeile="System und Hersteller wählen"
          zurueck={`/${auftraggeber.id}`}
        />
      }
    >
      <SystemAuswahl kunde={kunde} basis={`/${auftraggeber.id}/${kunde.id}`} />
    </Seite>
  );
}
