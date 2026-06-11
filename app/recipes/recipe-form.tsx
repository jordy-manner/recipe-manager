"use client";

import Link from "next/link";
import { useActionState, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { FormState } from "./actions";
import { TagsCombobox } from "./tags-combobox";
import { StepEditor } from "./step-editor";
import { Icon } from "../components/icons";
import { RecipePhoto, Tag, formatTime } from "../components/recipe-ui";

type IngredientRow = { key: number; name: string; quantity: string; unit: string };
type UtensilRow = { key: number; name: string; quantity: string };
type StepRow = { key: number; value: string };

export type RecipeFormValues = {
  title: string;
  description: string;
  servings: string;
  prepTime: string;
  cookTime: string;
  difficulty: number | null;
  rating: string;
  author: string;
  popular: boolean;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  imageUrl: string | null;
  ingredients: { name: string; quantity: string; unit: string }[];
  utensils: { name: string; quantity: string }[];
  steps: string[];
  tags: string[];
  categories: string[];
};

const EMPTY: RecipeFormValues = {
  title: "",
  description: "",
  servings: "",
  prepTime: "",
  cookTime: "",
  difficulty: null,
  rating: "",
  author: "",
  popular: false,
  kcal: "",
  protein: "",
  carbs: "",
  fat: "",
  imageUrl: null,
  ingredients: [],
  utensils: [],
  steps: [],
  tags: [],
  categories: [],
};

const DIFF_LABELS: Record<number, string> = { 1: "Facile", 2: "Moyen", 3: "Difficile" };

const fieldBase =
  "rounded-field border border-line bg-surface px-3.5 py-3 text-[15px] text-ink outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)] placeholder:text-ink-faint";
const fieldCls = `${fieldBase} w-full`;

function Block({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-7 first:border-t-0 first:pt-0">
      <h3 className="mb-4 text-[13px] font-extrabold uppercase tracking-[0.08em] text-ink-faint">
        {title}
        {hint && <span className="font-medium normal-case tracking-normal"> · {hint}</span>}
      </h3>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="mb-4 flex flex-col gap-2 last:mb-0">
      <span className="flex items-baseline gap-2 text-[14px] font-bold text-ink">
        {label}
        {hint && <span className="text-[12px] font-medium text-ink-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function SubmitButton({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-[15px] font-semibold text-white shadow-soft transition hover:bg-accent-deep active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon name="check" size={18} />
      {pending ? "Enregistrement…" : label}
    </button>
  );
}

/** Sortable row: drag handle (grip) + content. `id` unique within its context. */
function SortableRow({
  id,
  className,
  handleClassName,
  children,
}: {
  id: number;
  className: string;
  handleClassName?: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className={className}>
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Glisser pour réordonner"
        className={`grid shrink-0 cursor-grab touch-none place-items-center rounded-field text-ink-faint transition hover:bg-surface-2 hover:text-ink-soft active:cursor-grabbing ${handleClassName ?? "h-[38px] w-7"}`}
      >
        <Icon name="grip" size={16} />
      </button>
      {children}
    </div>
  );
}

function RemoveButton({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-field border border-line bg-surface text-ink-faint transition hover:border-accent hover:bg-accent-soft hover:text-accent disabled:cursor-not-allowed disabled:opacity-35"
    >
      <Icon name="x" size={16} />
    </button>
  );
}

function AddRowButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 inline-flex items-center gap-2 whitespace-nowrap rounded-field border border-dashed border-line bg-surface px-[18px] py-2.5 text-[14px] font-semibold text-ink-soft transition hover:border-accent hover:bg-accent-soft hover:text-accent"
    >
      <Icon name="plus" size={16} /> {children}
    </button>
  );
}

export function RecipeForm({
  action,
  defaultValues = EMPTY,
  submitLabel,
  ingredientOptions,
  unitOptions,
  utensilOptions,
  tagOptions,
  categoryOptions,
  mediaEnabled = false,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: RecipeFormValues;
  submitLabel: string;
  ingredientOptions: string[];
  unitOptions: string[];
  utensilOptions: string[];
  tagOptions: string[];
  categoryOptions: string[];
  mediaEnabled?: boolean;
}) {
  const [state, formAction] = useActionState(action, { error: null });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Scalar fields kept in state to drive the live preview.
  const [f, setF] = useState({
    title: defaultValues.title,
    description: defaultValues.description,
    servings: defaultValues.servings,
    prepTime: defaultValues.prepTime,
    cookTime: defaultValues.cookTime,
    difficulty: defaultValues.difficulty,
    rating: defaultValues.rating,
    author: defaultValues.author,
    popular: defaultValues.popular,
    kcal: defaultValues.kcal,
    protein: defaultValues.protein,
    carbs: defaultValues.carbs,
    fat: defaultValues.fat,
    categories: defaultValues.categories,
  });
  const set = (patch: Partial<typeof f>) => setF((prev) => ({ ...prev, ...patch }));
  const [tags, setTags] = useState<string[]>(defaultValues.tags);

  // Photo: existing URL (edit) + a local preview when a new file is picked.
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(defaultValues.imageUrl);
  const [removed, setRemoved] = useState(false);
  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      setRemoved(false);
    }
  }
  function clearPhoto() {
    setPreview(null);
    setRemoved(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  // Ingredient rows (at least one visible).
  const initialRows = defaultValues.ingredients.length
    ? defaultValues.ingredients
    : [{ name: "", quantity: "", unit: "" }];
  const keyCounter = useRef(initialRows.length);
  const [rows, setRows] = useState<IngredientRow[]>(
    initialRows.map((r, i) => ({ key: i, ...r })),
  );
  const updateRow = (key: number, patch: Partial<IngredientRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () =>
    setRows((rs) => [...rs, { key: keyCounter.current++, name: "", quantity: "", unit: "" }]);
  const removeRow = (key: number) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  const reorderRows = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setRows((rs) => {
      const from = rs.findIndex((r) => r.key === active.id);
      const to = rs.findIndex((r) => r.key === over.id);
      return from === -1 || to === -1 ? rs : arrayMove(rs, from, to);
    });
  };

  // Utensil rows (optional, can be empty).
  const initialUtensils = defaultValues.utensils;
  const utensilKey = useRef(initialUtensils.length);
  const [utensils, setUtensils] = useState<UtensilRow[]>(
    initialUtensils.map((u, i) => ({ key: i, ...u })),
  );
  const updateUtensil = (key: number, patch: Partial<UtensilRow>) =>
    setUtensils((us) => us.map((u) => (u.key === key ? { ...u, ...patch } : u)));
  const addUtensil = () =>
    setUtensils((us) => [...us, { key: utensilKey.current++, name: "", quantity: "" }]);
  const removeUtensil = (key: number) =>
    setUtensils((us) => us.filter((u) => u.key !== key));
  const reorderUtensils = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setUtensils((us) => {
      const from = us.findIndex((u) => u.key === active.id);
      const to = us.findIndex((u) => u.key === over.id);
      return from === -1 || to === -1 ? us : arrayMove(us, from, to);
    });
  };

  // Step rows (Markdown, at least one visible).
  const initialSteps = defaultValues.steps.length ? defaultValues.steps : [""];
  const stepKey = useRef(initialSteps.length);
  const [steps, setSteps] = useState<StepRow[]>(
    initialSteps.map((value, i) => ({ key: i, value })),
  );
  const updateStep = (key: number, value: string) =>
    setSteps((ss) => ss.map((s) => (s.key === key ? { ...s, value } : s)));
  const addStep = () => setSteps((ss) => [...ss, { key: stepKey.current++, value: "" }]);
  const removeStep = (key: number) =>
    setSteps((ss) => (ss.length > 1 ? ss.filter((s) => s.key !== key) : ss));
  const reorderSteps = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setSteps((ss) => {
      const from = ss.findIndex((s) => s.key === active.id);
      const to = ss.findIndex((s) => s.key === over.id);
      return from === -1 || to === -1 ? ss : arrayMove(ss, from, to);
    });
  };

  const toggleCategory = (c: string) =>
    set({
      categories: f.categories.includes(c)
        ? f.categories.filter((x) => x !== c)
        : [...f.categories, c],
    });

  const valid =
    f.title.trim().length > 0 &&
    rows.some((r) => r.name.trim().length > 0) &&
    steps.some((s) => s.value.trim().length > 0);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 items-start gap-14 md:grid-cols-[1fr_360px]"
    >
      <div className="min-w-0 max-w-[720px]">
        {state.error && (
          <p className="mb-5 rounded-field bg-accent-soft px-4 py-3 text-sm font-medium text-accent-ink">
            {state.error}
          </p>
        )}

        {/* Hidden inputs mirroring the controlled scalar/photo fields. */}
        <input ref={fileRef} type="file" name="photo" accept="image/*" hidden onChange={onPhoto} />
        <input type="hidden" name="removePhoto" value={removed ? "true" : "false"} />
        <input type="hidden" name="difficulty" value={f.difficulty ?? ""} />
        <input type="hidden" name="popular" value={f.popular ? "true" : "false"} />
        {f.categories.map((c) => (
          <input key={c} type="hidden" name="category" value={c} />
        ))}

        {/* 1. Photo */}
        <Block title="Photo">
          {preview ? (
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-card">
              <RecipePhoto imageUrl={preview} title={f.title || "Aperçu"} />
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-full bg-surface px-3.5 py-2 text-[13px] font-bold text-ink shadow-soft transition hover:text-accent"
                >
                  Changer la photo
                </button>
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="rounded-full bg-surface px-3.5 py-2 text-[13px] font-bold text-ink-faint shadow-soft transition hover:text-accent"
                >
                  Retirer
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-1.5 rounded-card border-2 border-dashed border-line px-6 py-10 text-center text-ink-faint transition hover:border-accent hover:bg-accent-soft"
            >
              <span className="mb-1.5 grid h-14 w-14 place-items-center rounded-full bg-surface-2 text-accent">
                <Icon name="image" size={26} />
              </span>
              <b className="text-[15px] text-ink">Ajouter une photo</b>
              <span className="text-[13px]">Cliquez pour parcourir vos fichiers</span>
            </button>
          )}
          {!mediaEnabled && (
            <p className="mt-2.5 text-[12.5px] text-ink-faint">
              Astuce : configurez Cloudinary (variables <code>CLOUDINARY_*</code>) pour activer
              l&apos;upload des photos.
            </p>
          )}
        </Block>

        {/* 2. Essentials */}
        <Block title="L'essentiel">
          <Field label="Titre de la recette *">
            <input
              name="title"
              value={f.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="ex. Tarte aux pommes de mamie"
              className={fieldCls}
              required
            />
          </Field>
          <Field label="Description courte">
            <textarea
              name="description"
              value={f.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={2}
              placeholder="Une phrase qui donne envie…"
              className={`${fieldCls} resize-y`}
            />
          </Field>

          <Field label="Catégories">
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((c) => {
                const on = f.categories.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCategory(c)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13.5px] font-semibold transition ${
                      on
                        ? "border-transparent bg-accent-soft text-accent-ink"
                        : "border-line text-ink-soft hover:border-ink-faint"
                    }`}
                  >
                    {on && <Icon name="check" size={13} />}
                    {c}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Difficulté">
            <div className="flex overflow-hidden rounded-field border border-line">
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => set({ difficulty: f.difficulty === d ? null : d })}
                  className={`flex-1 border-r border-line px-2 py-2.5 text-[13.5px] font-semibold transition last:border-r-0 ${
                    f.difficulty === d
                      ? "bg-accent text-white"
                      : "bg-surface text-ink-soft hover:bg-surface-2"
                  }`}
                >
                  {DIFF_LABELS[d]}
                </button>
              ))}
            </div>
          </Field>

          <div className="flex flex-wrap gap-4">
            <div className="flex-1">
              <Field label="Préparation" hint="min">
                <input
                  name="prepTime"
                  type="number"
                  min="0"
                  value={f.prepTime}
                  onChange={(e) => set({ prepTime: e.target.value })}
                  className={fieldCls}
                />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Cuisson" hint="min">
                <input
                  name="cookTime"
                  type="number"
                  min="0"
                  value={f.cookTime}
                  onChange={(e) => set({ cookTime: e.target.value })}
                  className={fieldCls}
                />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Portions" hint="pers.">
                <input
                  name="servings"
                  type="number"
                  min="1"
                  value={f.servings}
                  onChange={(e) => set({ servings: e.target.value })}
                  className={fieldCls}
                />
              </Field>
            </div>
          </div>

          <Field label="Tags">
            <TagsCombobox
              name="tag"
              options={tagOptions}
              defaultValue={defaultValues.tags}
              onSelectionChange={setTags}
            />
          </Field>
        </Block>

        {/* 3. Utensils (before ingredients) */}
        <Block title="Ustensiles" hint="facultatif">
          <DndContext
            id="dnd-utensils"
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={reorderUtensils}
          >
            <SortableContext items={utensils.map((u) => u.key)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2.5">
                {utensils.map((row) => (
                  <SortableRow key={row.key} id={row.key} className="flex items-center gap-2.5">
                    <input
                      name="utensilName"
                      list="utensil-options"
                      placeholder="ex. fouet, moule à tarte, mixeur…"
                      value={row.name}
                      onChange={(e) => updateUtensil(row.key, { name: e.target.value })}
                      className={`${fieldBase} min-w-0 flex-1`}
                      autoComplete="off"
                    />
                    <input type="hidden" name="utensilQuantity" value={row.quantity} />
                    <RemoveButton onClick={() => removeUtensil(row.key)} label="Supprimer cet ustensile" />
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <AddRowButton onClick={addUtensil}>Ajouter un ustensile</AddRowButton>
          <datalist id="utensil-options">
            {utensilOptions.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </Block>

        {/* 4. Ingredients */}
        <Block title="Ingrédients *">
          <div className="mb-2 hidden items-center gap-2.5 px-0.5 text-[12px] font-bold uppercase tracking-wider text-ink-faint sm:flex">
            <span className="w-7" />
            <span className="min-w-0 flex-1">Ingrédient</span>
            <span className="w-24">Quantité</span>
            <span className="w-32">Unité</span>
            <span className="w-[38px]" />
          </div>
          <DndContext
            id="dnd-ingredients"
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={reorderRows}
          >
            <SortableContext items={rows.map((r) => r.key)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2.5">
                {rows.map((row) => (
                  <SortableRow
                    key={row.key}
                    id={row.key}
                    className="flex flex-wrap items-center gap-2.5"
                  >
                    <input
                      name="ingredientName"
                      list="ingredient-options"
                      placeholder="ex. farine"
                      value={row.name}
                      onChange={(e) => updateRow(row.key, { name: e.target.value })}
                      className={`${fieldBase} min-w-[160px] flex-1`}
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
                      className={`${fieldBase} w-24`}
                    />
                    <input
                      name="ingredientUnit"
                      list="unit-options"
                      placeholder="g"
                      value={row.unit}
                      onChange={(e) => updateRow(row.key, { unit: e.target.value })}
                      className={`${fieldBase} w-32`}
                      autoComplete="off"
                    />
                    <RemoveButton
                      onClick={() => removeRow(row.key)}
                      label="Supprimer cet ingrédient"
                      disabled={rows.length <= 1}
                    />
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <AddRowButton onClick={addRow}>Ajouter un ingrédient</AddRowButton>
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
        </Block>

        {/* 5. Steps */}
        <Block title="Étapes de préparation *">
          <DndContext
            id="dnd-steps"
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={reorderSteps}
          >
            <SortableContext items={steps.map((s) => s.key)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-3">
                {steps.map((step, i) => (
                  <SortableRow
                    key={step.key}
                    id={step.key}
                    className="flex items-start gap-2.5"
                    handleClassName="mt-2 h-7 w-7"
                  >
                    <span className="mt-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-[14px] font-bold text-accent-ink">
                      {i + 1}
                    </span>
                    <StepEditor
                      name="step"
                      value={step.value}
                      onChange={(value) => updateStep(step.key, value)}
                      placeholder={`Décrivez l'étape ${i + 1}…`}
                    />
                    <RemoveButton
                      onClick={() => removeStep(step.key)}
                      label="Supprimer cette étape"
                      disabled={steps.length <= 1}
                    />
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <AddRowButton onClick={addStep}>Ajouter une étape</AddRowButton>
        </Block>

        {/* 6. Nutrition */}
        <Block title="Infos nutritionnelles" hint="par portion, optionnel">
          <div className="flex flex-wrap gap-4">
            {([
              ["kcal", "Calories", "kcal"],
              ["protein", "Protéines", "g"],
              ["carbs", "Glucides", "g"],
              ["fat", "Lipides", "g"],
            ] as const).map(([key, label, hint]) => (
              <div key={key} className="min-w-[120px] flex-1">
                <Field label={label} hint={hint}>
                  <input
                    name={key}
                    type="number"
                    min="0"
                    value={f[key]}
                    onChange={(e) => set({ [key]: e.target.value } as Partial<typeof f>)}
                    className={fieldCls}
                  />
                </Field>
              </div>
            ))}
          </div>
        </Block>

        {/* 7. Details */}
        <Block title="Détails" hint="optionnel">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1">
              <Field label="Auteur">
                <input
                  name="author"
                  value={f.author}
                  onChange={(e) => set({ author: e.target.value })}
                  placeholder="ex. Mamie Jeanne"
                  className={fieldCls}
                />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Note" hint="/ 5">
                <input
                  name="rating"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={f.rating}
                  onChange={(e) => set({ rating: e.target.value })}
                  placeholder="4.8"
                  className={fieldCls}
                />
              </Field>
            </div>
          </div>
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2.5 text-[14px] font-semibold text-ink">
            <input
              type="checkbox"
              checked={f.popular}
              onChange={(e) => set({ popular: e.target.checked })}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            Mettre en avant dans « Populaires cette semaine »
          </label>
        </Block>

        {/* Actions */}
        <div className="mt-7 flex items-center justify-end gap-3 border-t border-line pt-6">
          <Link
            href="/recipes"
            className="rounded-full px-4 py-2.5 text-[14px] font-semibold text-ink-soft transition hover:text-ink"
          >
            Annuler
          </Link>
          <SubmitButton label={submitLabel} disabled={!valid} />
        </div>
      </div>

      {/* Live preview */}
      <aside className="sticky top-[92px] hidden md:block">
        <span className="eyebrow">Aperçu</span>
        <article className="mt-3 overflow-hidden rounded-card border border-line-soft bg-surface shadow-soft">
          <div className="relative aspect-[16/10]">
            <RecipePhoto
              imageUrl={preview}
              title={f.title || "Titre de la recette"}
              label={f.categories[0] ?? "recette"}
            />
            {f.categories[0] && (
              <span className="absolute left-3.5 top-3.5 rounded-full bg-surface/90 px-3 py-1 font-mono text-[11px] font-medium tracking-wide text-ink backdrop-blur-[2px]">
                {f.categories[0]}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-3 p-5">
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 2).map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
            )}
            <h3 className="font-display text-[22px] font-semibold leading-tight">
              {f.title || "Titre de la recette"}
            </h3>
            <p className="line-clamp-2 text-sm leading-relaxed text-ink-soft">
              {f.description || "La description apparaîtra ici."}
            </p>
            <div className="flex items-center gap-4 text-[13px] font-medium text-ink-faint">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="clock" size={14} />
                {formatTime((Number(f.prepTime) || 0) + (Number(f.cookTime) || 0))}
              </span>
              {f.servings && (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="users" size={14} /> {f.servings}
                </span>
              )}
            </div>
          </div>
        </article>
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-faint">
          L&apos;aperçu se met à jour pendant que vous remplissez le formulaire.
        </p>
      </aside>
    </form>
  );
}
