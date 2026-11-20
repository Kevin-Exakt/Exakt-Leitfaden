import { notFound } from "next/navigation";
import { findeKunde, kundenParams } from "@/src/content/navigation";
import { Kopf, Seite } from "@/src/components/ui/Rahmen";
import { SystemAuswahl } from "@/src/components/techniker/VariantenAuswahl";

export function generateStaticParams() {
  return kundenParams();
}

export const metadata = { title: "Leitfäden" };

export default async function LeitfadenSystemWaehlen({ params }: PageProps<"/[auftraggeber]/leitfaden/[kunde]">) {
  const p = await params;
  const treffer = findeKunde(p.auftraggeber, p.kunde);
  if (!treffer) notFound();
  const { auftraggeber, kunde } = treffer;
  return (
    <Seite
      kopf={
        <Kopf
          titel={auftraggeber.kunden.length === 1 ? `Leitfäden · ${auftraggeber.name}` : `Leitfäden · ${kunde.name}`}
          unterzeile="Nachschlagen ohne Einsatz"
          zurueck={`/${auftraggeber.id}/leitfaden`}
        />
      }
    >
      <SystemAuswahl kunde={kunde} basis={`/${auftraggeber.id}/leitfaden/${kunde.id}`} />
    </Seite>
  );
}
