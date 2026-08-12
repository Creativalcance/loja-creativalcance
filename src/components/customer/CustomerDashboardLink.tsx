import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CustomerDashboardLink() {
  return (
    <Link
      href="/area-cliente"
      prefetch={false}
      className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-950 hover:text-neutral-950"
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      Voltar ao dashboard
    </Link>
  );
}
