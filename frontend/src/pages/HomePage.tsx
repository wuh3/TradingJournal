import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateJournal, useJournal, useJournals } from '../api/hooks'
import { OrdersSection } from '../components/OrdersSection'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function HomePage() {
  const navigate = useNavigate()
  const today = todayIso()

  // Look up whether today already has a journal (there can be at most one).
  const { data: todaysJournals, isLoading: findingToday } = useJournals({ date_from: today, date_to: today })
  const todaysJournalId = todaysJournals?.[0]?.id
  const { data: journal, isLoading: loadingJournal } = useJournal(todaysJournalId)
  const createJournal = useCreateJournal()

  const weekdayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    []
  )

  async function handleCreateToday() {
    await createJournal.mutateAsync({ date: today })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Home</h2>
        <p className="text-sm text-slate-500">{weekdayLabel}</p>
      </div>

      {findingToday ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : !todaysJournalId ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white py-24">
          <p className="text-sm text-slate-500">No journal entry for today yet.</p>
          <button
            type="button"
            disabled={createJournal.isPending}
            onClick={handleCreateToday}
            className="rounded-xl bg-slate-900 px-8 py-4 text-lg font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Create Your Journal Today
          </button>
        </div>
      ) : loadingJournal || !journal ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Today's Orders</h3>
            <button
              type="button"
              onClick={() => navigate(`/journals/${journal.id}`)}
              className="text-sm font-medium text-slate-700 hover:underline"
            >
              Open full journal →
            </button>
          </div>
          <OrdersSection journalId={journal.id} orders={journal.orders} />
        </div>
      )}
    </div>
  )
}
