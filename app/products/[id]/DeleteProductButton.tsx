'use client'

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProduct } from "../actions";

export default function DeleteProductButton({ productId, name }: { productId: number; name: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deleteProduct(productId);
      if ("error" in result) {
        alert(result.error);
        return;
      }
      if (result.hidden)
        alert(`"${name}" has sales history, so it was hidden instead of deleted to keep your sales records correct.`);
      router.push("/products");
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-sm font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
