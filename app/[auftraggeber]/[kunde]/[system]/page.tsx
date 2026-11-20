import { notFound } from "next/navigation";
import { FileClock } from "lucide-react";
import { findeKunde } from "@/src/content/navigation";
import { getRepository } from "@/src/content/repository";
import { ButtonLink } from "@/src/components/ui/Button";
import { Kopf, Seite } from "@/src/components/ui/Rahmen";
import { SystemAuswahl } from "@/src/components/techniker/VariantenAuswahl";

export function generateStaticParams() {
  return getRepository()
    .getAlleAuftraggeber()
    .flatMap((a) => a.kunden.flatMap((k) => k.systeme.map((s) => ({ auftraggeber: a.id, kunde: k.id, system: s.id }))));
}

export const metadata = { title: "System" };

/** Einzelnes System – z. B. ein System ohne Hersteller, für das noch kein Leitfaden hinterlegt ist. */
export default async function SystemSeite({ params }: PageProps<"/[auftraggeber]/[kunde]/[system]">) {
  const p = await params;
  const treffer = findeKunde(p.auftraggeber, p.kunde);
  const system = treffer?.kunde.systeme.find((s) => s.id === p.system);
  if (!treffer || !system) notFound();
  const { auftraggeber, kunde } = treffer;
  const auswahlUrl = `/${auftraggeber.id}/${kunde.id}`;
  const kopf = <Kopf titel={system.name} unterzeile={auftraggeber.kunden.length === 1 ? auftraggeber.name : `${auftraggeber.name} · ${kunde.name}`} zurueck={auswahlUrl} />;

  if (system.varianten.length > 0)
    return (
      <Seite kopf={kopf}>
        <SystemAuswahl kunde={{ ...kunde, systeme: [system] }} basis={auswahlUrl} />
      </Seite>
    );

  return (
    <Seite kopf={kopf}>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-karte p-8 text-center">
        <FileClock className="size-10 text-text-leise" aria-hidden />
        <p className="text-lg font-semibold">Leitfaden folgt</p>
        <p className="text-text-leise">
          Für {system.name} ist noch kein Leitfaden hinterlegt. Bei Fragen bitte den Innendienst kontaktieren.
        </p>
      </div>
      <ButtonLink href={auswahlUrl} breit>
        Zurück zur Auswahl
      </ButtonLink>
    </Seite>
  );
}
