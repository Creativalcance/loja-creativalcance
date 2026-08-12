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
| Stock PT | De hora a hora, ao minuto 05 |
| Stock CZ | De hora a hora, ao minuto 15 |
| Disponibilidade comercial | De hora a hora, ao minuto 25 |
| Cores, tipos, árvore e tabelas de personalização | Diariamente, durante a madrugada |
| Produtos, imagens e traduções | 4 vezes por dia |
| Variantes, preços, imagens e componentes | 4 vezes por dia |
| Cancelados e restrições PT | 4 vezes por dia |
| Opções de personalização derivadas | Um lote por hora até concluir o ciclo diário |

Esta cadência consome 24 pedidos diários por endpoint de stock e 4 pedidos
diários por cada método incremental, mantendo margem face aos limites Stricker
de 96 pedidos/dia para stocks e 22 pedidos/dia para os restantes métodos.

## Segurança e controlo

- As rotas rejeitam pedidos sem o `CRON_SECRET` correto.
- Cada tarefa obtém um bloqueio atómico no Supabase antes de começar.
- Uma execução duplicada é ignorada enquanto a primeira estiver ativa.
- O bloqueio expira automaticamente após 330 segundos em caso de interrupção.
- Os resultados continuam registados em `supplier_dataset_imports` e visíveis
  em `/admin/sincronizacao`.
- Os botões manuais continuam disponíveis para recuperação e controlo.

