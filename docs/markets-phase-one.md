# Mercados, impostos e moedas — primeira fase

Base: main 30150bb (gestão de produtos manuais 360). Sem migração de base de dados.

## Comportamento entregue

- 249 códigos ISO de país nas moradas, com nomes nos seis idiomas.
- A área do cliente deixa de gravar todas as moradas como PT; os prefixos fiscais são preservados.
- Código postal português normalizado para determinar continente, Madeira e Açores. A presença de nomes de ilhas/municípios numa rua não altera o IVA.
- Uma única função fiscal no resumo e na cobrança. Mantém as taxas normais portuguesas existentes; não certifica o enquadramento fiscal de todos os artigos.
- Destinos não portugueses, códigos inválidos e moedas de cobrança diferentes de EUR não avançam para pagamento automático. Guardam a morada/carrinho e mostram contacto comercial; o link abre o email do cliente e não envia dados automaticamente.
- Guarda versão da regra, país, código postal, tratamento e taxa nas novas encomendas. Não modifica encomendas/faturas antigas.
- Referência USD opcional no resumo do pagamento. Consulta pública ao BCE apenas quando solicitada. Sem câmbio de reserva inventado; falha/atraso não afeta o total EUR. Dados com mais de sete dias são recusados.
- Painel administrativo /admin/mercados informa o estado real; não permite ativar regras fiscais não implementadas.

## Limites intencionais e trabalho pendente

Esta entrega é uma primeira fase, não um motor fiscal internacional completo. Não ativa OSS, VIES, isenções, Stripe Tax, cobrança USD, DDP, faturação multimoeda ou cálculo aduaneiro. As regiões estrangeiras continuam a ser texto livre. Não disponibiliza USD em todo o catálogo. Não cria automaticamente pedidos de orçamento nem promete entrega nos 249 países/territórios.

É necessário confirmar com o contabilista o regime efetivo da 360, localização das operações em cadeia, categorias/taxas por artigo, OSS, condições e provas de isenção. Com a Stricker: expedição efetiva, transporte por conta de quem, exportador/importador, restrições e moeda dos preços. Origem de fabrico e país do armazém não são equivalentes.

Mantém-se o regime doméstico anterior, incluindo a taxa normal para o catálogo existente. O código postal identifica a região de destino; não prova, sozinho, a localização jurídica de todas as operações. Produtos com taxa especial ou origem de expedição diferente exigem o enquadramento seguinte antes de expansão.

Dados disponíveis nos anexos Stricker: CountryOfOrigin, Taric, Currency em respostas SOAP, Destination.Country, StocksByCountry, RestrictedProducts. Não há prova de um motor de impostos/câmbio na documentação fornecida. Nenhuma nova chamada ao fornecedor foi introduzida.

## Verificação e publicação

Testes: tests/markets.test.mjs (países, taxas regionais, guardas de destino, referências cambiais, ação de pagamento e gravação de moradas). Regressões: autenticação/carrinho, workflows de conta/encomenda, detalhes e produtos manuais.

Antes de publicar: confirmar preview autenticado dos três passos de checkout, nova morada e morada guardada, billing separado, compra de artigo manual e Stricker com Stripe em modo de teste. Testar a origem de câmbio na infraestrutura de destino, incluindo erro/timeout. Não usar pagamentos reais para testar.

A publicação não deve habilitar qualquer isenção nem envio automático para um país novo. Eventuais sessões Stripe anteriores à publicação devem ser consideradas na revisão de rollout; o código novo não as reescreve.

Rollback: reverter o commit desta fase. Moradas estrangeiras novas devem continuar protegidas contra cobrança com IVA português ao reverter — não remover a guarda de destino sem tratar essas moradas. Nenhuma migração ou eliminação de dados é necessária.

## Referências consultadas

- https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/iva18.aspx
- https://vat-one-stop-shop.ec.europa.eu/one-stop-shop_en
- https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html
- https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
