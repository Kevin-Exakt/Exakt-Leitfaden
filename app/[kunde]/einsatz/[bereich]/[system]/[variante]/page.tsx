import { notFound } from "next/navigation";
import { alleVarianten, variantenParams } from "@/src/content/navigation";
import { getRepository } from "@/src/content/repository";
import { EinsatzApp } from "@/src/components/techniker/EinsatzApp";

export function generateStaticParams() {
  return variantenParams();
}

export const metadata = { title: "Einsatz" };

export default async function EinsatzSeite({ params }: PageProps<"/[kunde]/einsatz/[bereich]/[system]/[variante]">) {
  const p = await params;
  const eintrag = alleVarianten().find(
    (x) => x.kunde === p.kunde && x.bereich === p.bereich && x.system === p.system && x.variante === p.variante,
  );
  const kunde = getRepository().getKunde(p.kunde);
  if (!eintrag || !kunde) notFound();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
      <EinsatzApp
        pfad={{ kunde: p.kunde, bereich: p.bereich, system: p.system, variante: p.variante }}
        bezeichnung={{
          kunde: `${kunde.name} · ${eintrag.bereichName}`,
          system: eintrag.systemName,
          hersteller: eintrag.herstellerName,
        }}
        variante={eintrag.v}
        kunde={{ links: kunde.links, ankunft: eintrag.ankunft }}
        startUrl={`/${kunde.id}`}
      />
    </div>
  );
}
