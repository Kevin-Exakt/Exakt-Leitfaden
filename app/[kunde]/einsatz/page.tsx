import { notFound } from "next/navigation";
import { getRepository } from "@/src/content/repository";
import { kundenParams } from "@/src/content/navigation";
import { Kopf, Seite } from "@/src/components/ui/Rahmen";
import { VariantenAuswahl } from "@/src/components/techniker/VariantenAuswahl";

export function generateStaticParams() {
  return kundenParams();
}

export const metadata = { title: "Service starten" };

export default async function SystemAuswahl({ params }: PageProps<"/[kunde]/einsatz">) {
  const { kunde: kundeId } = await params;
  const kunde = getRepository().getKunde(kundeId);
  if (!kunde) notFound();
  return (
    <Seite kopf={<Kopf titel="Service starten" unterzeile="System und Hersteller wählen" zurueck={`/${kunde.id}`} />}>
      <VariantenAuswahl kunde={kunde} basis={`/${kunde.id}/einsatz`} />
    </Seite>
  );
}
