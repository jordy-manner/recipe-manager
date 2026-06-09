"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "./actions";

type IngredientRow = { key: number; name: string; quantity: string; unit: string };

export type RecipeFormValues = {
  title: string;
  description: string;
  servings: string;
  prepTime: string;
  cookTime: string;
  ingredients: { name: string; quantity: string; unit: string }[];
  steps: string; // une ligne par étape
  tags: string; // séparés par des virgules
};

const EMPTY: RecipeFormValues = {
  title: "",
  description: "",
  servings: "",
  prepTime: "",
  cookTime: "",
  ingredients: [],
  steps: "",
  tags: "",
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
    >
      {pending ? "Enregistrement…" : label}
    </button>
  );
}

const field =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900";
const labelCls = "block text-sm font-medium mb-1";

export function RecipeForm({
  action,
  defaultValues = EMPTY,
  submitLabel,
  ingredientOptions,
  unitOptions,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: RecipeFormValues;
  submitLabel: string;
  ingredientOptions: string[];
  unitOptions: string[];
}) {
  const [state, formAction] = useActionState(action, { error: null });

  // Lignes d'ingrédients gérées en état (au moins une ligne visible).
  const keyCounter = useRef(0);
  const [rows, setRows] = useState<IngredientRow[]>(
    (defaultValues.ingredients.length
      ? defaultValues.ingredients
      : [{ name: "", quantity: "", unit: "" }]
    ).map((r) => ({ key: keyCounter.current++, ...r })),
  );

  const updateRow = (key: number, patch: Partial<IngredientRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () =>
    setRows((rs) => [
      ...rs,
      { key: keyCounter.current++, name: "", quantity: "", unit: "" },
    ]);
  const removeRow = (key: number) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="title" className={labelCls}>
          Titre *
        </label>
        <input id="title" name="title" defaultValue={defaultValues.title} className={`${field} w-full`} required />
      </div>

      <div>
        <label htmlFor="description" className={labelCls}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={defaultValues.description}
          rows={2}
          className={`${field} w-full`}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="servings" className={labelCls}>
            Parts
          </label>
          <input id="servings" name="servings" type="number" min="0" defaultValue={defaultValues.servings} className={`${field} w-full`} />
        </div>
        <div>
          <label htmlFor="prepTime" className={labelCls}>
            Préparation (min)
          </label>
          <input id="prepTime" name="prepTime" type="number" min="0" defaultValue={defaultValues.prepTime} className={`${field} w-full`} />
        </div>
        <div>
          <label htmlFor="cookTime" className={labelCls}>
            Cuisson (min)
          </label>
          <input id="cookTime" name="cookTime" type="number" min="0" defaultValue={defaultValues.cookTime} className={`${field} w-full`} />
        </div>
      </div>

      {/* Ingrédients : lignes dynamiques (nom autocomplete · quantité · unité autocomplete) */}
      <div>
        <span className={labelCls}>Ingrédients</span>
        <div className="flex flex-col gap-2">
          {/* En-têtes de colonnes */}
          <div className="hidden gap-2 text-xs text-zinc-500 sm:flex">
            <span className="flex-1">Ingrédient</span>
            <span className="w-24">Quantité</span>
            <span className="w-36">Unité</span>
            <span className="w-8" />
          </div>

          {rows.map((row) => (
            <div key={row.key} className="flex flex-wrap items-center gap-2">
              <input
                name="ingredientName"
                list="ingredient-options"
                placeholder="ex. farine"
                value={row.name}
                onChange={(e) => updateRow(row.key, { name: e.target.value })}
                className={`${field} min-w-40 flex-1`}
                autoComplete="off"
              />
              <input
                name="ingredientQuantity"
                type="number"
                step="any"
                min="0"
                placeholder="250"
                value={row.quantity}
                onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                className={`${field} w-24`}
              />
              <input
                name="ingredientUnit"
                list="unit-options"
                placeholder="g"
                value={row.unit}
                onChange={(e) => updateRow(row.key, { unit: e.target.value })}
                className={`${field} w-36`}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                aria-label="Supprimer cette ligne"
                className="flex h-9 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="mt-2 text-sm font-medium text-zinc-700 hover:underline dark:text-zinc-300"
        >
          + Ajouter un ingrédient
        </button>

        {/* Suggestions d'autocomplétion (création libre possible) */}
        <datalist id="ingredient-options">
          {ingredientOptions.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
        <datalist id="unit-options">
          {unitOptions.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      </div>

      <div>
        <label htmlFor="steps" className={labelCls}>
          Étapes <span className="text-zinc-500">(une par ligne)</span>
        </label>
        <textarea
          id="steps"
          name="steps"
          defaultValue={defaultValues.steps}
          rows={6}
          className={`${field} w-full`}
          placeholder={"Mélanger la farine et les œufs\nLaisser reposer 30 min"}
        />
      </div>

      <div>
        <label htmlFor="tags" className={labelCls}>
          Tags <span className="text-zinc-500">(séparés par des virgules)</span>
        </label>
        <input id="tags" name="tags" defaultValue={defaultValues.tags} className={`${field} w-full`} placeholder="dessert, rapide, végétarien" />
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
        <Link href="/recipes" className="text-sm text-zinc-500 hover:underline">
          Annuler
        </Link>
      </div>
    </form>
  );
}
