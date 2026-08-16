import { useMemo, useState } from 'react'
import {
  useCalculate,
  useCreateFactor,
  useDeleteFactor,
  useFactors,
  usePresets,
  useUpdateFactor,
} from '../api/hooks'
import type { CalculateResult, Factor, Preset } from '../api/types'

export function CalculatorPage() {
  const { data: presets, isLoading: presetsLoading } = usePresets()
  const { data: factors, isLoading: factorsLoading } = useFactors()
  const createFactor = useCreateFactor()
  const updateFactor = useUpdateFactor()
  const deleteFactor = useDeleteFactor()
  const calculate = useCalculate()

  const [values, setValues] = useState<Record<number, number>>({})
  const [result, setResult] = useState<CalculateResult | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  async function handleCalculate() {
    const res = await calculate.mutateAsync(values)
    setResult(res)
  }

  const addedKeys = new Set((factors ?? []).map((f) => f.preset_key))
  const availablePresets = (presets ?? []).filter((p) => !addedKeys.has(p.key))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Entry Quality Calculator</h2>
        <p className="mt-1 text-sm text-slate-500">
          Score a potential trade out of 100 from a weighted sum of preset factors (RSI, Fear &amp; Greed,
          confluence count, etc), each with its own built-in scoring logic. Pick the factors that apply and
          set their weight (0–100) — weight 0 means it doesn't count. Unchecked boolean factors count as a
          discouraging "no" (not just zero contribution), so leave a factor's weight at 0 if it truly
          shouldn't affect the score.
        </p>
      </div>

      {presetsLoading || factorsLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="space-y-3">
          {(factors ?? []).map((factor) => (
            <FactorRow
              key={factor.id}
              factor={factor}
              value={values[factor.id]}
              onValueChange={(v) => setValues((prev) => ({ ...prev, [factor.id]: v }))}
              onWeightChange={(w) => updateFactor.mutate({ id: factor.id, weight: w })}
              onDelete={() => deleteFactor.mutate(factor.id)}
            />
          ))}
          {(factors ?? []).length === 0 && (
            <p className="text-sm text-slate-400">
              No factors added yet. Search the preset catalog below to add your first one.
            </p>
          )}
        </div>
      )}

      {showPicker ? (
        <PresetPicker
          presets={availablePresets}
          onCancel={() => setShowPicker(false)}
          onAdd={async (presetKey) => {
            await createFactor.mutateAsync({ preset_key: presetKey, weight: 0 })
          }}
          loading={createFactor.isPending}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50"
        >
          + Add factor
        </button>
      )}

      <div className="border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={handleCalculate}
          disabled={calculate.isPending || (factors ?? []).length === 0}
          className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Calculate
        </button>

        {result && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Score</p>
            <p className="mt-1 text-4xl font-semibold text-slate-900">{result.score}</p>
            <div className="mt-4 space-y-1">
              {result.breakdown.map((b) => (
                <p key={b.factor_id} className="text-xs text-slate-500">
                  {b.name}: raw {b.raw_value} → normalized {b.normalized_value.toFixed(2)} × weight {b.weight} =
                  contribution {b.contribution.toFixed(2)}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FactorRow({
  factor,
  value,
  onValueChange,
  onWeightChange,
  onDelete,
}: {
  factor: Factor
  value: number | undefined
  onValueChange: (v: number) => void
  onWeightChange: (w: number) => void
  onDelete: () => void
}) {
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="min-w-[14rem] flex-1">
        <p className="text-sm font-medium text-slate-900">{factor.name}</p>
        <p className="mt-0.5 text-xs text-slate-400">{factor.description}</p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Weight (0–100)</label>
        <input
          type="number"
          min={0}
          max={100}
          step="any"
          defaultValue={factor.weight}
          onBlur={(e) => {
            const clamped = Math.max(0, Math.min(100, Number(e.target.value)))
            onWeightChange(clamped)
          }}
          className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Value</label>
        {factor.input_type === 'boolean' ? (
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onValueChange(e.target.checked ? 1 : 0)}
            className="mt-1 h-5 w-5"
          />
        ) : (
          <input
            type="number"
            step="any"
            value={value ?? ''}
            onChange={(e) => onValueChange(Number(e.target.value))}
            className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
          />
        )}
      </div>

      <button type="button" onClick={onDelete} className="ml-auto self-center text-sm text-red-600 hover:underline">
        Remove
      </button>
    </div>
  )
}

function PresetPicker({
  presets,
  onCancel,
  onAdd,
  loading,
}: {
  presets: Preset[]
  onCancel: () => void
  onAdd: (presetKey: string) => Promise<void>
  loading: boolean
}) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return presets
    return presets.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.key.includes(q)
    )
  }, [presets, search])

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <input
          type="text"
          autoFocus
          placeholder="Search factors (e.g. RSI, VWAP, confluence)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          Close
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400">
          {presets.length === 0 ? 'All available presets have been added.' : 'No presets match your search.'}
        </p>
      ) : (
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {filtered.map((preset) => (
            <button
              key={preset.key}
              type="button"
              disabled={loading}
              onClick={() => onAdd(preset.key)}
              className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <span>
                <span className="font-medium text-slate-900">{preset.name}</span>
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                  {preset.input_type === 'boolean' ? 'yes / no' : 'number'}
                </span>
                <br />
                <span className="text-xs text-slate-400">{preset.description}</span>
              </span>
              <span className="shrink-0 self-center text-xs font-medium text-slate-500">+ Add</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
