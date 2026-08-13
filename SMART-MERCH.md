# 360 Smart Merch — Sprint 1

## Objetivo

O 360 Smart Merch interpreta pedidos em linguagem natural e recomenda apenas produtos reais existentes no catálogo Supabase sincronizado com a Stricker.

## Fluxo

1. O utilizador descreve o que procura e pode indicar quantidade, orçamento e data.
2. A OpenAI transforma o pedido numa `SmartQuery` validada por Zod.
3. A aplicação consulta produtos ativos e compráveis no Supabase.
4. O servidor valida variante, cor, quantidade mínima, escalão de preço e stock.
5. O Match Score usa apenas critérios para os quais existem dados.
6. Os resultados ligam à página de produto existente.

## Variáveis de ambiente

```text
OPENAI_API_KEY=
OPENAI_SMART_MERCH_MODEL=gpt-5.6-luna
```

`OPENAI_API_KEY` é exclusivamente server-side. Nunca deve usar o prefixo `NEXT_PUBLIC_`.

## Limites intencionais do Sprint 1

- As pesquisas não são guardadas.
- A OpenAI não recebe catálogo, preços, stock, SKU nem dados de clientes.
- O valor apresentado corresponde apenas ao produto para a quantidade indicada.
- Personalização, setup, portes e IVA não são estimados sem dados suficientes.
- A data limite é interpretada, mas não recebe pontuação nem promessa de entrega enquanto os SLA de produção e transporte não estiverem integrados.
- Popularidade não recebe pontuação porque ainda não existe uma métrica consolidada.

## Testes recomendados

1. `500 garrafas sustentáveis até 3 € para uma feira`
2. `100 presentes premium para colaboradores até 15 € por pessoa`
3. `250 garrafas pretas para um congresso`
4. `Brindes tecnológicos abaixo de 5 €`
5. `Tenho 1.000 € para oferecer brindes a 400 clientes`

Em cada teste, confirmar:

- interpretação da quantidade e orçamento;
- variante/cor correta;
- preço correspondente ao escalão da quantidade;
- stock suficiente;
- explicações factuais;
- ligação para a página de produto.
