# Revisão de pendências de lançamento — 1 de outubro de 2026

## Correções desta revisão

- Os crons horários de stock passam a executar PT aos 5 minutos, CZ aos 10 e a reconciliação de disponibilidade aos 15. A operação combinada continua disponível, mas já não é agendada. Os bloqueios existentes mantêm-se. Cada país continua a ter uma consulta de stock por hora.
- Cada transferência de stock tem até duas tentativas de 60 segundos, em vez de até três de 180 segundos. O processamento conserva margem dentro do limite de 300 segundos para escrever dados e registar falhas. Isto reduz o risco de interrupção, não garante que todas as operações terminem dentro do orçamento em qualquer condição de carga.
- A política de tentativas do cliente REST reconhece também as falhas de rede depois de serem convertidas para a mensagem em português. A opção de tentativas aplica-se ao cliente de leitura de catálogo, não ao cliente de submissão de encomendas.
- As páginas comerciais e de aplicações/indústrias limitam primeiro os produtos candidatos. As relações de imagens, preços e stock são carregadas apenas para esses IDs, mantendo RLS, os filtros de produto ativo, as regras comerciais e a localização. Não se introduziu cache de preços ou stock.
- A lista de produtos do sitemap usa ordenação pelo ID para paginação estável e cache de cinco minutos. Uma falha da consulta não é guardada como lista vazia na cache. Mantém-se o tratamento de erro já existente da rota.
- A validação do código de serviço consulta apenas opções da variante escolhida ou opções genéricas e percorre páginas de 1000 registos. Não aceita uma única opção incompatível com a técnica, localização ou família de tabela solicitadas. Códigos ambíguos continuam a impedir a validação automática.

## Intervenção operacional

O registo de importação CZ `d386e9a8-bcc7-4104-9a4e-5eea782d473c`, iniciado às 04:09 UTC e sem conclusão, foi encerrado como falha por execução interrompida. A atualização exigiu o ID exato, estado running, ausência de finished_at e antiguidade superior a uma hora. Nenhum dado de catálogo ou encomenda foi eliminado.

## Verificação local

- 196 testes automáticos aprovados, incluindo 17 novos testes de consultas SEO, tentativas limitadas e resolução de serviço paginada.
- ESLint sem erros ou avisos; TypeScript sem erros; build Next.js concluído.
- Exemplos REST/SOAP fornecidos confirmam o campo `Appproved` de ServiceOrderV1; não foi alterado para uma grafia incompatível.
- Pagamentos, configuração de modo de teste, impostos, portes e emissão de emails não foram ativados nem modificados por esta revisão.

## Validações ainda necessárias

- Nova execução de customizationTables e das cores nos seis idiomas, depois das correções já publicadas em 28 de setembro. A falha anterior à correção não prova uma falha da versão atual, mas também não comprova recuperação.
- Verificação dos novos crons com os serviços configurados na Vercel. O teste local não usa credenciais do fornecedor e não substitui a execução remota.
- Compra autenticada em TEST: artigo simples, personalizado e manual 360; receção e associação de artwork; webhook, processamento, emails, área de cliente e backoffice.
- Ativação e teste da proteção contra palavras-passe comprometidas nas definições de Authentication do Supabase. O conector disponível não expõe a alteração destas definições.
- Confirmação da faturação ao cliente, condições de expedição e revisão de credenciais Stripe de produção/webhook. Não usar a fatura do fornecedor como fatura ao cliente.
- Checkout automático internacional permanece bloqueado; a primeira fase admite destinos portugueses e EUR. Não se ativaram isenções nem novos mercados.

Não reprocessar automaticamente as encomendas de teste falhadas/parciais sem rever os eventos existentes: OrderV1 pode ter sido aceite mesmo quando ServiceOrderV1 falhou. Um reenvio indiscriminado pode duplicar pedidos.

## Correção das opções de personalização

- A ação administrativa agenda um trabalho persistente e responde imediatamente. Um cron autenticado processa os trabalhos a cada dois minutos, sob o bloqueio de integração existente, sem depender de uma página aberta. Captura do fornecedor e geração têm invocações separadas. A geração trabalha em lotes de 25 localizações, com checkpoints após escrita completa e orçamento de 180 segundos entre lotes.
- Falhas e interrupções repetem o lote atual; não avançam sobre opções que ficaram por gravar. Três interrupções consecutivas suspendem o trabalho para retoma explícita. O administrador pode cancelar um trabalho pendente ou em execução. A expiração de importações individuais não encerra o trabalho duradouro.
- A fonte técnica usa PT, como as variantes e localizações canónicas; não depende do idioma selecionado para as traduções do catálogo. O ciclo começa do início para regenerar também as opções produzidas pelas regras antigas.
- As consultas do cache e dos preços têm paginação com ordenação estável. O editor também lê todas as páginas das opções e dos preços, sem cortar aos primeiros 1000 registos. Uma falha de leitura não é apresentada como catálogo completo.
- O checkpoint conserva a data da captura completa e lê apenas essa captura. A limpeza de registos antigos pode demorar sem contaminar o ciclo com serviços obsoletos. A captura semanal é adiada enquanto uma geração está ativa.
- A geração e o editor incluem áreas adicionais da mesma técnica, como LSR2-02 quando o campo representativo contém LSR2-01. Cada opção conserva a sua tabela concreta. Os limites de cores vêm da tabela correspondente, evitando interpretar a lista `1, 4` como um limite de uma cor. Uma opção sem tabela de preços fica inativa; um código único de outra localização não é associado à área escolhida.
- Os códigos antigos inventados e os serviços retirados da captura completa ficam inativos por variante, sem apagar opções ou referências históricas. Esta reconciliação ocorre apenas após escrita completa e só com uma captura identificada. Produtos retirados do ficheiro oficial não bloqueiam todo o ciclo.
- Validação local: 215 testes aprovados, incluindo 19 novos casos de paginação, áreas, cores, checkpoints, interrupções, cancelamento e reconciliação de serviços; ESLint, TypeScript e build concluídos.

As compras simples e manuais em TEST foram confirmadas pelo utilizador, incluindo emails e área de cliente. A compra personalizada continua por validar depois da regeneração; esta correção não ativa pagamentos ou submissões em LIVE.
