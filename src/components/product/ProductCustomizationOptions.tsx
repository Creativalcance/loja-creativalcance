"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ImageIcon,
  MapPin,
  Ruler,
  Sparkles,
} from "lucide-react";
import CustomizationLocationImage from "@/components/product/CustomizationLocationImage";

export type ProductCustomizationOption = {
  id: string;
  technique: string;
  componentName: string | null;
  locationName: string;
  maxPrintingAreaMm: string | null;
  maxAreaCm2: number | null;
  imageUrls: string[];
  isRecommended: boolean;
  href: string;
};

type ProductCustomizationOptionsProps = {
  options: ProductCustomizationOption[];
};

function getOptionSubtitle(option: ProductCustomizationOption): string {
  const details = [
    option.componentName,
    option.locationName,
    option.maxPrintingAreaMm,
  ].filter(Boolean);

  return details.join(" · ");
}

export default function ProductCustomizationOptions({
  options,
}: ProductCustomizationOptionsProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    options[0]?.id ?? null,
  );

  useEffect(() => {
    if (!selectedOptionId && options[0]) {
      setSelectedOptionId(options[0].id);
      return;
    }

    const selectedOptionExists = options.some(
      (option) => option.id === selectedOptionId,
    );

    if (!selectedOptionExists) {
      setSelectedOptionId(options[0]?.id ?? null);
    }
  }, [options, selectedOptionId]);

  const selectedOption = useMemo(() => {
    return (
      options.find((option) => option.id === selectedOptionId) ??
      options[0] ??
      null
    );
  }, [options, selectedOptionId]);

  if (options.length === 0 || !selectedOption) {
    return (
      <section className="mt-10 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            Personalização
          </p>

          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
            Possibilidades de personalização do produto
          </h2>
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm leading-6 text-neutral-600">
          Este produto pode ser encomendado online. A personalização será
          apresentada quando existir informação técnica disponível para este
          artigo.
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
          Personalização
        </p>

        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
          Escolha a área de personalização
        </h2>

        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
          Seleccione uma técnica ou localização para visualizar a posição no
          produto, a área máxima disponível e avançar para a criação da maquete.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-3">
          <div className="mb-3 flex items-center gap-2 px-2 pt-2">
            <Sparkles className="h-4 w-4 text-neutral-500" />

            <p className="text-sm font-semibold text-neutral-950">
              Opções disponíveis
            </p>
          </div>

          <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
            {options.map((option) => {
              const isSelected = option.id === selectedOption.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedOptionId(option.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? "border-neutral-950 bg-white shadow-sm"
                      : "border-transparent bg-white/70 hover:border-neutral-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                        {option.technique}
                      </p>

                      <p className="mt-2 text-base font-semibold text-neutral-950">
                        {option.locationName}
                      </p>
                    </div>

                    {option.isRecommended ? (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Recomendada
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-1 text-sm text-neutral-600">
                    {option.componentName ? (
                      <p className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                        {option.componentName}
                      </p>
                    ) : null}

                    {option.maxPrintingAreaMm ? (
                      <p className="flex items-center gap-2">
                        <Ruler className="h-3.5 w-3.5 text-neutral-400" />
                        {option.maxPrintingAreaMm}
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-h-[420px] items-center justify-center bg-white">
              {selectedOption.imageUrls.length > 0 ? (
                <CustomizationLocationImage
                  urls={selectedOption.imageUrls}
                  alt={getOptionSubtitle(selectedOption)}
                  className="h-full max-h-[560px] w-full object-contain p-8"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-neutral-400">
                  <ImageIcon className="h-10 w-10" />
                </div>
              )}
            </div>

            <div className="border-t border-neutral-200 bg-neutral-50 p-6 xl:border-l xl:border-t-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                {selectedOption.technique}
              </p>

              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
                {selectedOption.locationName}
              </h3>

              <p className="mt-3 text-sm leading-6 text-neutral-600">
                {getOptionSubtitle(selectedOption) ||
                  "Área disponível para personalização."}
              </p>

              <div className="mt-6 space-y-3">
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Técnica
                  </p>

                  <p className="mt-1 font-semibold text-neutral-950">
                    {selectedOption.technique}
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Localização
                  </p>

                  <p className="mt-1 font-semibold text-neutral-950">
                    {selectedOption.locationName}
                  </p>
                </div>

                {selectedOption.componentName ? (
                  <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                      Componente
                    </p>

                    <p className="mt-1 font-semibold text-neutral-950">
                      {selectedOption.componentName}
                    </p>
                  </div>
                ) : null}

                {selectedOption.maxPrintingAreaMm ? (
                  <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                      Área máxima
                    </p>

                    <p className="mt-1 font-semibold text-neutral-950">
                      {selectedOption.maxPrintingAreaMm}
                    </p>
                  </div>
                ) : null}
              </div>

              <Link
                href={selectedOption.href}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-5 py-4 text-sm font-semibold !text-white transition hover:bg-neutral-800"
              >
                Criar maquete
                <ArrowRight className="ml-2 h-4 w-4 !text-white" />
              </Link>

              <p className="mt-4 text-xs leading-5 text-neutral-500">
                A maquete permite posicionar o logótipo e preparar a
                pré-visualização antes de avançar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}