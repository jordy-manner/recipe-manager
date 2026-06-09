"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "./actions";

export type RecipeFormValues = {
  title: string;
  description: string;
  servings: string;
  prepTime: string;
  cookTime: string;
  ingredients: string; // une ligne par ingrédient
  steps: string; // une ligne par étape
  tags: string; // séparés par des virgules
};

const EMPTY: RecipeFormValues = {
  title: "",
  description: "",
  servings: "",
  prepTime: "",
  cookTime: "",
  ingredients: "",
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
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900";
const labelCls = "block text-sm font-medium mb-1";

export function RecipeForm({
  action,
  defaultValues = EMPTY,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: RecipeFormValues;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, { error: null });

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
        <input id="title" name="title" defaultValue={defaultValues.title} className={field} required />
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
          className={field}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="servings" className={labelCls}>
            Parts
          </label>
          <input id="servings" name="servings" type="number" min="0" defaultValue={defaultValues.servings} className={field} />
        </div>
        <div>
          <label htmlFor="prepTime" className={labelCls}>
            Préparation (min)
          </label>
          <input id="prepTime" name="prepTime" type="number" min="0" defaultValue={defaultValues.prepTime} className={field} />
        </div>
        <div>
          <label htmlFor="cookTime" className={labelCls}>
            Cuisson (min)
          </label>
          <input id="cookTime" name="cookTime" type="number" min="0" defaultValue={defaultValues.cookTime} className={field} />
        </div>
      </div>

      <div>
        <label htmlFor="ingredients" className={labelCls}>
          Ingrédients <span className="text-zinc-500">(un par ligne)</span>
        </label>
        <textarea
          id="ingredients"
          name="ingredients"
          defaultValue={defaultValues.ingredients}
          rows={6}
          className={field}
          placeholder={"200 g de farine\n3 œufs\n1 pincée de sel"}
        />
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
          className={field}
          placeholder={"Mélanger la farine et les œufs\nLaisser reposer 30 min"}
        />
      </div>

      <div>
        <label htmlFor="tags" className={labelCls}>
          Tags <span className="text-zinc-500">(séparés par des virgules)</span>
        </label>
        <input id="tags" name="tags" defaultValue={defaultValues.tags} className={field} placeholder="dessert, rapide, végétarien" />
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