import { notFound } from "next/navigation";
import { BookOpen, PlayCircle } from "lucide-react";
import { getRepository } from "@/src/content/repository";
import { auftraggeberParams, variantenNamen } from "@/src/content/navigation";
import { ButtonLink } from "@/src/components/ui/Button";
import { Kopf, Seite } from "@/src/components/ui/Rahmen";
import { LaufenderEinsatz } from "@/src/components/techniker/LaufenderEinsatz";

export function generateStaticParams() {
  return auftraggeberParams();
}

export default async function AuftraggeberStart({ params }: PageProps<"/[auftraggeber]">) {
  const { auftraggeber: auftraggeberId } = await params;
  const auftraggeber = getRepository().getAuftraggeber(auftraggeberId);
  if (!auftraggeber) notFound();

  return (
    <Seite kopf={<Kopf titel={auftraggeber.name} unterzeile="Exakt-Service Navigator" zurueck="/" />}>
      <LaufenderEinsatz auftraggeber={auftraggeber.id} namen={variantenNamen(auftraggeber.id)} />
      <div className="space-y-3 pt-2">
        <ButtonLink href={`/${auftraggeber.id}/einsatz`} variante="primaer" breit icon={<PlayCircle className="size-6" />} className="min-h-20 text-xl">
          Service starten
        </ButtonLink>
        <ButtonLink href={`/${auftraggeber.id}/leitfaden`} breit icon={<BookOpen className="size-6" />} className="min-h-20 text-xl">
          Systeme / Leitfäden
        </ButtonLink>
      </div>
    </Seite>
  );
}
