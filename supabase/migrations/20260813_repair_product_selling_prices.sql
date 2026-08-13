-- Mantém o preço Stricker como custo do fornecedor e repara apenas o preço
-- de venda. As regras manuais continuam a prevalecer sobre a regra automática.

update public.product_prices
set base_price = supplier_price,
    final_price = case
      when pricing_mode = 'manual' and manual_price is not null
        then round(manual_price, 2)
      when pricing_mode = 'fixed_markup'
        then round(supplier_price + coalesce(fixed_markup, 0), 2)
      when pricing_mode = 'markup'
        then round(
          supplier_price * (1 + coalesce(markup_percentage, 0) / 100),
          2
        )
      when pricing_mode = 'margin'
        and coalesce(margin_percentage, 0) < 100
        then round(
          supplier_price / (1 - coalesce(margin_percentage, 0) / 100),
          2
        )
      when coalesce(margin_percentage, margin_rate * 100, 0) < 100
        then round(
          supplier_price /
            (1 - coalesce(margin_percentage, margin_rate * 100, 0) / 100),
          2
        )
      else round(supplier_price, 2)
    end,
    calculated_at = now()
where supplier_price is not null
  and supplier_price >= 0;
