# Sincronização automática Stricker

A produção usa Vercel Cron para executar as sincronizações através de rotas
protegidas por `CRON_SECRET`. Todos os horários em `vercel.json` são UTC.

## Variável obrigatória na Vercel

Criar uma variável de ambiente apenas no ambiente **Production**:

```text
CRON_SECRET=<segredo aleatório com pelo menos 32 caracteres>
```

Depois de adicionar ou alterar a variável, é necessário publicar novamente a
produção. A Vercel envia automaticamente o cabeçalho
`Authorization: Bearer <CRON_SECRET>` em cada execução agendada.

## Cadência

| Dados | Frequência |
| --- | --- |
| Stocks PT e CZ + disponibilidade comercial | De hora a hora, numa única execução |
| Cores, tipos, árvore e tabelas de personalização | Uma vez por dia, durante a madrugada |
| Produtos, imagens e traduções | Uma vez por dia, durante a madrugada |
| Variantes, preços, imagens e componentes | Uma vez por dia, durante a madrugada |
| Cancelados e restrições PT | Uma vez por dia, durante a madrugada |
| Opções de personalização derivadas | Em lotes, apenas entre as 04:00 e as 05:59 UTC |
| Estado das encomendas Stricker | Uma vez por dia, no final da janela noturna |

Durante o dia só é descarregado o stock. Os restantes datasets são consultados
na janela noturna e as rotinas incrementais preservam os registos cujo payload
da Stricker não sofreu alterações.

## Segurança e controlo

- As rotas rejeitam pedidos sem o `CRON_SECRET` correto.
- Todas as tarefas automáticas partilham um bloqueio atómico no Supabase.
- Uma nova execução é ignorada enquanto outra sincronização automática estiver ativa.
- O bloqueio expira automaticamente após 330 segundos em caso de interrupção.
- Os resultados continuam registados em `supplier_dataset_imports` e visíveis
  em `/admin/sincronizacao`.
- Os botões manuais continuam disponíveis para recuperação e controlo.
