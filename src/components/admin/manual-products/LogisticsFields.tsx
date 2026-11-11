"use client";

import { useState } from "react";

export default function LogisticsFields({ weight = null, dimensions = "", minimum = 10,
  shippingProfile = "standard", deliveryUnitPrice = null }: {
  weight?: number | null; dimensions?: string | null; minimum?: number;
  shippingProfile?: string; deliveryUnitPrice?: number | null;
}) {
  const [profile, setProfile] = useState(shippingProfile);
  const [quantity, setQuantity] = useState(String(minimum));
  const hamper = profile === "christmas_hamper_2026";
  const input = "mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 font-normal";
  return <>
    <label className="block text-sm font-semibold">Peso (kg)
      <input className={input} name="weight_kg" inputMode="decimal" placeholder="2,27" defaultValue={weight === null ? "" : weight / 1000} />
    </label>
    <label className="block text-sm font-semibold">Dimensões
      <input className={input} name="dimensions" maxLength={200} placeholder="30 × 20 × 15 cm" defaultValue={dimensions ?? ""} />
    </label>
    <label className="block text-sm font-semibold">Condições de entrega
      <select className={input} name="shipping_profile" value={profile} onChange={event => {
        const next = event.target.value;
        setProfile(next);
        setQuantity(next === "christmas_hamper_2026" ? "1" : String(Math.max(10, Number(quantity) || 10)));
      }}>
        <option value="standard">Portes normais da loja</option>
        <option value="christmas_hamper_2026">Tabela de cabazes e packs de Natal 2026</option>
      </select>
    </label>
    <label className="block text-sm font-semibold">Quantidade mínima
      <input className={input} name="minimum" type="number" required min={hamper ? 1 : 10} max={1000000} value={quantity} onChange={event => setQuantity(event.target.value)} />
    </label>
    {hamper && <>
      <label className="block text-sm font-semibold">Portes por unidade, sem IVA (€)
        <input className={input} name="delivery_unit_price" required inputMode="decimal" placeholder="6,00" defaultValue={deliveryUnitPrice ?? ""} />
      </label>
      <p className="text-sm leading-6 text-neutral-600 md:col-span-2">
        Aplica apenas aos produtos desta tabela. Até 9 unidades: portes por cabaz.
        De 10 a 24: 40 € + IVA. A partir de 25: entrega gratuita numa única morada em Portugal Continental.
        Várias moradas ou falta de acesso ao rés-do-chão/cais exigem contacto prévio com a 360.
      </p>
    </>}
  </>;
}
