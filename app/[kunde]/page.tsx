import { notFound } from "next/navigation";
import { BookOpen, PlayCircle } from "lucide-react";
import { getRepository } from "@/src/content/repository";
import { kundenParams, variantenNamen } from "@/src/content/navigation";
import { ButtonLink } from "@/src/components/ui/Button";
import { Kopf, Seite } from "@/src/components/ui/Rahmen";
import { LaufenderEinsatz } from "@/src/components/techniker/LaufenderEinsatz";

export function generateStaticParams() {
  return kundenParams();
}

export default async function KundenStart({ params }: PageProps<"/[kunde]">) {
  const { kunde: kundeId } = await params;
  const kunde = getRepository().getKunde(kundeId);
  if (!kunde) notFound();

  return (
    <Seite kopf={<Kopf titel={`${kunde.name} Service`} unterzeile="Exakt-Service Navigator" />}>
      <LaufenderEinsatz kunde={kunde.id} namen={variantenNamen(kunde.id)} />
      <div className="space-y-3 pt-2">
        <ButtonLink href={`/${kunde.id}/einsatz`} variante="primaer" breit icon={<PlayCircle className="size-6" />} className="min-h-20 text-xl">
          Service starten
        </ButtonLink>
        <ButtonLink href={`/${kunde.id}/leitfaden`} breit icon={<BookOpen className="size-6" />} className="min-h-20 text-xl">
          Systeme / Leitfäden
        </ButtonLink>
      </div>
    </Seite>
  );
}
