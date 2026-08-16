import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCreateJournal, useJournals, useTags, type JournalFilters } from '../api/hooks'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function JournalsPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<JournalFilters>({})
  const [searchInput, setSearchInput] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)

  const { data: tags } = useTags()
  const { data: journals, isLoading } = useJournals(filters)
  const createJournal = useCreateJournal()

  const todaysJournals = useMemo(
    () => (journals ?? []).filter((j) => j.date === todayIso()),
    [journals]
  )

  async function handleCreateJournal(date: string) {
    // Idempotent on the backend: if a journal for this date already exists,
    // this just returns it and we redirect there instead of erroring.
    const journal = await createJournal.mutateAsync({ date })
    navigate(`/journals/${journal.id}`)
  }

  function applySearch() {
    setFilters((f) => ({ ...f, search: searchInput || undefined }))
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Journals</h2>
          <p className="text-sm text-slate-500">Every trading day you've journaled, one entry per day.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewForm((v) => !v)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + New Journal
        </button>
      </div>

      {showNewForm && (
        <NewJournalForm
          onCancel={() => setShowNewForm(false)}
          onSubmit={handleCreateJournal}
          loading={createJournal.isPending}
        />
      )}

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Today's Journals
        </h3>
        {todaysJournals.length === 0 ? (
          <p className="text-sm text-slate-400">No journal entries for today yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {todaysJournals.map((j) => (
              <JournalCard key={j.id} journal={j} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">All Journals</h3>
          <Link to="/pnl" className="text-sm font-medium text-slate-700 hover:underline">
            View trades &amp; P&amp;L →
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <input
            type="text"
            placeholder="Search notes or ticker…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={applySearch}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Search
          </button>

          <input
            type="date"
            value={filters.date_from ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value || undefined }))}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={filters.date_to ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value || undefined }))}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          />

          <select
            value={filters.tag_id?.[0] ?? ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, tag_id: e.target.value ? [Number(e.target.value)] : undefined }))
            }
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="">All tags</option>
            {(tags ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {(filters.search || filters.date_from || filters.date_to || filters.tag_id) && (
            <button
              type="button"
              onClick={() => {
                setFilters({})
                setSearchInput('')
              }}
              className="text-sm text-slate-500 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (journals ?? []).length === 0 ? (
          <p className="text-sm text-slate-400">No journals match these filters.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Notes</th>
                  <th className="px-4 py-2">Tags</th>
                  <th className="px-4 py-2">Orders</th>
                </tr>
              </thead>
              <tbody>
                {(journals ?? []).map((j) => (
                  <tr
                    key={j.id}
                    onClick={() => navigate(`/journals/${j.id}`)}
                    className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-4 py-2 font-medium text-slate-900">{j.date}</td>
                    <td className="max-w-xs truncate px-4 py-2 text-slate-600">{j.notes || '—'}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {j.tags.map((t) => (
                          <span
                            key={t.id}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{j.order_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function JournalCard({ journal }: { journal: { id: number; date: string; notes: string | null; order_count: number } }) {
  return (
    <Link
      to={`/journals/${journal.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-sm"
    >
      <p className="font-medium text-slate-900">{journal.date}</p>
      <p className="mt-1 truncate text-sm text-slate-500">{journal.notes || 'No notes'}</p>
      <p className="mt-2 text-xs text-slate-400">{journal.order_count} order(s)</p>
    </Link>
  )
}

function NewJournalForm({
  onCancel,
  onSubmit,
  loading,
}: {
  onCancel: () => void
  onSubmit: (date: string) => void
  loading: boolean
}) {
  const [date, setDate] = useState(todayIso())
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => onSubmit(date)}
          className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Create
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
