import { notFound } from "next/navigation";
import { findeKunde, kundenParams } from "@/src/content/navigation";
import { Kopf, Seite } from "@/src/components/ui/Rahmen";
import { SystemAuswahl } from "@/src/components/techniker/VariantenAuswahl";

export function generateStaticParams() {
  return kundenParams();
}

export const metadata = { title: "Service starten" };

export default async function SystemWaehlen({ params }: PageProps<"/[auftraggeber]/einsatz/[kunde]">) {
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
          zurueck={`/${auftraggeber.id}/einsatz`}
        />
      }
    >
      <SystemAuswahl kunde={kunde} basis={`/${auftraggeber.id}/einsatz/${kunde.id}`} />
    </Seite>
  );
}
