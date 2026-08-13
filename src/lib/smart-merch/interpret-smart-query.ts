import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import {
  normaliseSmartQuery,
  smartQuerySchema,
  smartMerchRequestSchema,
} from "@/lib/smart-merch/smart-query";
import type { SmartQuery } from "@/lib/smart-merch/types";

type InterpretSmartQueryInput = {
  request: string;
  quantity?: number | null;
  budget?: number | null;
  deadline?: string | null;
  sort?: SmartQuery["sort"];
};

const SYSTEM_INSTRUCTIONS = `És o interpretador de intenção do 360 Smart Merch.
Transforma pedidos de merchandising escritos em português ou noutra língua numa estrutura factual.
Não inventes produtos, marcas, SKU, preços, stock, prazos, materiais, cores ou características.
Extrai apenas o que o utilizador escreveu ou implicou de forma inequívoca.
Usa arrays vazios e null quando a informação não existe.
Normaliza datas para YYYY-MM-DD. A data atual é fornecida no pedido.
Mantém palavras-chave curtas e úteis para pesquisar nomes, descrições, tipos, subtipos e materiais.
Se o utilizador indicar quantidade e orçamento total, calcula o orçamento unitário máximo.
"sustainable" só deve ser true quando o utilizador pedir sustentabilidade, materiais reciclados, FSC, ecológico ou equivalente.
Nunca devolvas SQL, nomes de tabelas, nomes de colunas nem instruções para consultar dados.`;

export async function interpretSmartQuery(
  input: InterpretSmartQueryInput,
): Promise<SmartQuery> {
  const parsedInput = smartMerchRequestSchema.parse(input);
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_SMART_MERCH_MODEL?.trim() || "gpt-5.6-luna";
  const today = new Date().toISOString().slice(0, 10);

  const completion = await openai.chat.completions.parse({
    model,
    messages: [
      { role: "system", content: SYSTEM_INSTRUCTIONS },
      {
        role: "user",
        content: JSON.stringify({ today, ...parsedInput }),
      },
    ],
    response_format: zodResponseFormat(smartQuerySchema, "smart_query"),
  });

  const interpreted = completion.choices[0]?.message.parsed;

  if (!interpreted) {
    throw new Error("SMART_QUERY_NOT_INTERPRETED");
  }

  const overridden = smartQuerySchema.parse({
    ...interpreted,
    originalText: parsedInput.request,
    quantity: parsedInput.quantity ?? interpreted.quantity,
    totalBudget: parsedInput.budget ?? interpreted.totalBudget,
    deadline: parsedInput.deadline ?? interpreted.deadline,
    sort: parsedInput.sort ?? interpreted.sort,
  });

  return normaliseSmartQuery(overridden);
}
