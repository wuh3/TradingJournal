import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { imageUrl, useDeleteJournal, useJournal, useUpdateJournal, useUploadJournalImage } from '../api/hooks'
import { OrdersSection } from '../components/OrdersSection'

export function JournalDetailPage() {
  const { id } = useParams()
  const journalId = Number(id)
  const navigate = useNavigate()

  const { data: journal, isLoading } = useJournal(journalId)
  const updateJournal = useUpdateJournal(journalId)
  const deleteJournal = useDeleteJournal()
  const uploadJournalImage = useUploadJournalImage(journalId)

  const [notesDraft, setNotesDraft] = useState<string | null>(null)
  const journalImageInput = useRef<HTMLInputElement>(null)

  if (isLoading || !journal) {
    return <p className="text-sm text-slate-400">Loading…</p>
  }

  const notes = notesDraft ?? journal.notes ?? ''
  const notesChanged = notesDraft !== null && notesDraft !== (journal.notes ?? '')

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate('/journals')}
            className="mb-2 text-sm text-slate-500 hover:underline"
          >
            ← Back to Journals
          </button>
          <h2 className="text-2xl font-semibold text-slate-900">{journal.date}</h2>
          {journal.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {journal.tags.map((t) => (
                <span
                  key={t.id}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={async () => {
            if (confirm('Delete this journal entry? This also deletes its orders and images.')) {
              await deleteJournal.mutateAsync(journal.id)
              navigate('/journals')
            }
          }}
          className="text-sm text-red-600 hover:underline"
        >
          Delete journal
        </button>
      </div>

      {/* Notes */}
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotesDraft(e.target.value)}
          rows={4}
          placeholder="Add notes about this trading day…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        {notesChanged && (
          <button
            type="button"
            onClick={async () => {
              await updateJournal.mutateAsync({ notes: notesDraft ?? '' })
              setNotesDraft(null)
            }}
            className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            Save notes
          </button>
        )}
      </section>

      {/* Journal images */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Images</h3>
          <button
            type="button"
            onClick={() => journalImageInput.current?.click()}
            className="text-sm font-medium text-slate-700 hover:underline"
          >
            + Add image
          </button>
          <input
            ref={journalImageInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (file) await uploadJournalImage.mutateAsync(file)
              e.target.value = ''
            }}
          />
        </div>
        {journal.images.length === 0 ? (
          <p className="text-sm text-slate-400">No images yet.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {journal.images.map((img) => (
              <img
                key={img.id}
                src={imageUrl('journal', img.id)}
                alt={img.filename}
                className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
              />
            ))}
          </div>
        )}
      </section>

      {/* Orders */}
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Orders</h3>
        <p className="mb-3 text-xs text-slate-400">
          Tags are set per order below and roll up to the journal-level tags shown above.
        </p>
        <OrdersSection journalId={journalId} orders={journal.orders} />
      </section>
    </div>
  )
}
