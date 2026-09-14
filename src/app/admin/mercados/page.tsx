import Link from "next/link";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { MARKET_POLICY_VERSION } from "@/lib/markets/policy";
export const dynamic = "force-dynamic";
export default async function MarketsPage() {
  await assertAdminAccess("/admin/mercados");
  const rows = [
    ["Portugal", "Checkout em EUR", "Regime de taxa normal existente; região identificada pelo código postal."],
    ["Outros destinos", "Confirmação comercial", "IVA, transporte e documentação por validar antes de cobrar."],
    ["USD", "Referência no resumo do pagamento", "Câmbio indicativo do BCE. A cobrança continua em EUR."],
    ["OSS e VIES", "Não ativados", "Confirmar o enquadramento fiscal, registo OSS e provas exigidas."],
    ["Alfândega / DDP", "Não ativados", "Confirmar expedidor, exportador, importador e encargos por destino."],
  ];
  return <main className="mx-auto max-w-6xl px-6 py-10"><Link href="/admin" className="text-sm underline">Voltar ao backoffice</Link><h1 className="mt-6 text-3xl font-semibold">Mercados, impostos e moedas</h1><p className="mt-3 text-neutral-600">Estado operacional da primeira fase. Selecionar um país numa morada não ativa isenções nem entregas automáticas nesse mercado.</p><div className="mt-8 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Mercado / serviço</th><th className="p-3">Estado</th><th className="p-3">Enquadramento</th></tr></thead><tbody>{rows.map(([name,status,description]) => <tr key={name} className="border-t border-neutral-200"><th className="p-3">{name}</th><td className="p-3">{status}</td><td className="p-3">{description}</td></tr>)}</tbody></table></div><p className="mt-6 text-sm text-neutral-500">Versão do cálculo guardada nas novas encomendas: {MARKET_POLICY_VERSION}.</p><h2 className="mt-8 text-xl font-semibold">Confirmações necessárias para a fase seguinte</h2><ul className="mt-4 list-disc space-y-2 pl-5"><li>Contabilista: regime OSS, operações em cadeia, categorias fiscais e motivos legais de isenção.</li><li>Stricker: país de expedição efetivo por encomenda, transporte por conta de quem e documentação de exportação.</li><li>Transportador: destinos suportados, modalidade DAP/DDP e custos de importação.</li><li>Moedas: política de câmbio, faturação e reembolsos antes de cobrar em USD.</li></ul></main>;
}
