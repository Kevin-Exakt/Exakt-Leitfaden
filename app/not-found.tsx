import { ButtonLink } from "@/src/components/ui/Button";
import { Kopf, Seite } from "@/src/components/ui/Rahmen";

export default function NichtGefunden() {
  return (
    <Seite kopf={<Kopf titel="Seite nicht gefunden" />}>
      <p className="text-lg">Diese Seite gibt es nicht (mehr). Vielleicht wurde der Link geändert.</p>
      <ButtonLink href="/" variante="primaer" breit>
        Zur Startseite
      </ButtonLink>
    </Seite>
  );
}
