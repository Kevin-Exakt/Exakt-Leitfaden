import { notFound } from "next/navigation";
import { alleVarianten, variantenParams } from "@/src/content/navigation";
import { getRepository } from "@/src/content/repository";
import { EinsatzApp } from "@/src/components/techniker/EinsatzApp";

export function generateStaticParams() {
  return variantenParams();
}

export const metadata = { title: "Leitfaden" };

export default async function LeitfadenSeite({ params }: PageProps<"/[auftraggeber]/[kunde]/[system]/[variante]">) {
  const p = await params;
  const eintrag = alleVarianten().find(
    (x) => x.auftraggeber === p.auftraggeber && x.kunde === p.kunde && x.system === p.system && x.variante === p.variante,
  );
  const auftraggeber = getRepository().getAuftraggeber(p.auftraggeber);
  if (!eintrag || !auftraggeber) notFound();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
      <EinsatzApp
        pfad={{ auftraggeber: p.auftraggeber, kunde: p.kunde, system: p.system, variante: p.variante }}
        bezeichnung={{
          auftraggeber: `${auftraggeber.name} · ${eintrag.kundeName}`,
          system: eintrag.systemName,
          hersteller: eintrag.herstellerName,
        }}
        variante={eintrag.v}
        auftraggeber={{ links: auftraggeber.links, ankunft: eintrag.ankunft }}
        startUrl={`/${auftraggeber.id}`}
        auswahlUrl={`/${auftraggeber.id}/${p.kunde}`}
      />
    </div>
  );
}
