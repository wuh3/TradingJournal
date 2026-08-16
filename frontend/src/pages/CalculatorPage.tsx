import { useState } from 'react'
import {
  useCalculate,
  useCreateFactor,
  useDeleteFactor,
  useFactors,
  useUpdateFactor,
} from '../api/hooks'
import type { CalculateResult, Factor, FactorType } from '../api/types'

export function CalculatorPage() {
  const { data: factors, isLoading } = useFactors()
  const createFactor = useCreateFactor()
  const updateFactor = useUpdateFactor()
  const deleteFactor = useDeleteFactor()
  const calculate = useCalculate()

  const [values, setValues] = useState<Record<number, number>>({})
  const [result, setResult] = useState<CalculateResult | null>(null)
  const [showForm, setShowForm] = useState(false)

  async function handleCalculate() {
    const res = await calculate.mutateAsync(values)
    setResult(res)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Entry Quality Calculator</h2>
        <p className="mt-1 text-sm text-slate-500">
          Score a potential trade out of 100 from a weighted sum of your own factors (Risk/Reward, RSI,
          confluence of key levels, etc). Set each factor's weight below — weight 0 means it doesn't count.
        </p>
      </div>

      {isLoading ? (
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
              No factors yet. Add one below (e.g. "Risk/Reward ≥ 2" as a boolean, or "RSI" as a number 0-100).
            </p>
          )}
        </div>
      )}

      {showForm ? (
        <NewFactorForm
          onCancel={() => setShowForm(false)}
          onSubmit={async (payload) => {
            await createFactor.mutateAsync(payload)
            setShowForm(false)
          }}
          loading={createFactor.isPending}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
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
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="min-w-[10rem] flex-1">
        <p className="text-sm font-medium text-slate-900">{factor.name}</p>
        <p className="text-xs text-slate-400">
          {factor.factor_type === 'number' ? `range ${factor.min_value}–${factor.max_value}` : 'yes / no'}
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Weight</label>
        <input
          type="number"
          step="any"
          defaultValue={factor.weight}
          onBlur={(e) => onWeightChange(Number(e.target.value))}
          className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Value</label>
        {factor.factor_type === 'boolean' ? (
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onValueChange(e.target.checked ? 1 : 0)}
            className="h-5 w-5"
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

      <button type="button" onClick={onDelete} className="ml-auto text-sm text-red-600 hover:underline">
        Remove
      </button>
    </div>
  )
}

function NewFactorForm({
  onCancel,
  onSubmit,
  loading,
}: {
  onCancel: () => void
  onSubmit: (payload: {
    name: string
    factor_type: FactorType
    weight: number
    min_value?: number
    max_value?: number
  }) => void
  loading: boolean
}) {
  const [name, setName] = useState('')
  const [factorType, setFactorType] = useState<FactorType>('boolean')
  const [weight, setWeight] = useState('1')
  const [minValue, setMinValue] = useState('0')
  const [maxValue, setMaxValue] = useState('100')

  const canSubmit = name.trim() && (factorType === 'boolean' || (minValue !== '' && maxValue !== ''))

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Type</label>
          <select
            value={factorType}
            onChange={(e) => setFactorType(e.target.value as FactorType)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="boolean">Yes / No</option>
            <option value="number">Number</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Weight</label>
          <input
            type="number"
            step="any"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        {factorType === 'number' && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Min</label>
              <input
                type="number"
                step="any"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Max</label>
              <input
                type="number"
                step="any"
                value={maxValue}
                onChange={(e) => setMaxValue(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
          </>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={!canSubmit || loading}
          onClick={() =>
            onSubmit({
              name: name.trim(),
              factor_type: factorType,
              weight: Number(weight),
              min_value: factorType === 'number' ? Number(minValue) : undefined,
              max_value: factorType === 'number' ? Number(maxValue) : undefined,
            })
          }
          className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Add factor
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
