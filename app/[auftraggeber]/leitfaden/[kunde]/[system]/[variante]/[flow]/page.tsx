import { notFound } from "next/navigation";
import { alleVarianten } from "@/src/content/navigation";
import { Kopf } from "@/src/components/ui/Rahmen";
import { FlowFrei } from "@/src/components/techniker/FlowFrei";

export function generateStaticParams() {
  return alleVarianten().flatMap(({ auftraggeber, kunde, system, variante, v }) =>
    Object.keys(v.flows).map((flow) => ({ auftraggeber, kunde, system, variante, flow })),
  );
}

export const metadata = { title: "Ablauf" };

export default async function FlowSeite({ params }: PageProps<"/[auftraggeber]/leitfaden/[kunde]/[system]/[variante]/[flow]">) {
  const p = await params;
  const x = alleVarianten().find(
    (y) => y.auftraggeber === p.auftraggeber && y.kunde === p.kunde && y.system === p.system && y.variante === p.variante,
  );
  const flow = x?.v.flows[p.flow];
  if (!x || !flow) notFound();
  const vb = x.v.vorbereitung;
  const namen = Object.fromEntries(
    [...vb.werkzeug, ...vb.messgeraete, ...vb.material, ...vb.ersatzteile, ...vb.dokumente].map((e) => [e.id, e.name]),
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
      <Kopf
        titel={flow.titel}
        unterzeile={`${x.systemName} · ${x.herstellerName} · Nachschlagen`}
        zurueck={`/${p.auftraggeber}/leitfaden/${p.kunde}/${p.system}/${p.variante}`}
      />
      <FlowFrei flow={flow} namen={namen} />
    </div>
  );
}
