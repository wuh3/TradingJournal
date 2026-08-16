import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  imageUrl,
  useCreateLink,
  useCreateOrder,
  useCreateTag,
  useDeleteJournal,
  useDeleteLink,
  useDeleteOrder,
  useJournal,
  useLinkableOrders,
  useTags,
  useUpdateJournal,
  useUploadJournalImage,
  useUploadOrderImage,
} from '../api/hooks'
import type { Direction, Order, OrderStatus } from '../api/types'

export function JournalDetailPage() {
  const { id } = useParams()
  const journalId = Number(id)
  const navigate = useNavigate()

  const { data: journal, isLoading } = useJournal(journalId)
  const { data: allTags } = useTags()
  const updateJournal = useUpdateJournal(journalId)
  const deleteJournal = useDeleteJournal()
  const createTag = useCreateTag()
  const uploadJournalImage = useUploadJournalImage(journalId)

  const [notesDraft, setNotesDraft] = useState<string | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const journalImageInput = useRef<HTMLInputElement>(null)

  if (isLoading || !journal) {
    return <p className="text-sm text-slate-400">Loading…</p>
  }

  const journalData = journal

  const notes = notesDraft ?? journalData.notes ?? ''
  const notesChanged = notesDraft !== null && notesDraft !== (journalData.notes ?? '')

  const selectedTagIds = new Set(journalData.tags.map((t) => t.id))

  async function toggleTag(tagId: number) {
    const next = selectedTagIds.has(tagId)
      ? journalData.tags.filter((t) => t.id !== tagId).map((t) => t.id)
      : [...journalData.tags.map((t) => t.id), tagId]
    await updateJournal.mutateAsync({ tag_ids: next })
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return
    const tag = await createTag.mutateAsync({ name: newTagName.trim() })
    setNewTagName('')
    await updateJournal.mutateAsync({ tag_ids: [...journalData.tags.map((t) => t.id), tag.id] })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mb-2 text-sm text-slate-500 hover:underline"
          >
            ← Back to Home
          </button>
          <h2 className="text-2xl font-semibold text-slate-900">{journal.date}</h2>
        </div>
        <button
          type="button"
          onClick={async () => {
            if (confirm('Delete this journal entry? This also deletes its orders and images.')) {
              await deleteJournal.mutateAsync(journal.id)
              navigate('/')
            }
          }}
          className="text-sm text-red-600 hover:underline"
        >
          Delete journal
        </button>
      </div>

      {/* Tags */}
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Tags</h3>
        <div className="flex flex-wrap items-center gap-2">
          {(allTags ?? []).map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedTagIds.has(tag.id)
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tag.name}
            </button>
          ))}
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
            placeholder="+ new tag"
            className="w-28 rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs focus:border-slate-500 focus:outline-none"
          />
        </div>
      </section>

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
        <OrdersSection journalId={journalId} orders={journal.orders} />
      </section>
    </div>
  )
}

function OrdersSection({ journalId, orders }: { journalId: number; orders: Order[] }) {
  const createOrder = useCreateOrder(journalId)
  const deleteOrder = useDeleteOrder(journalId)
  const uploadOrderImage = useUploadOrderImage(journalId)
  const deleteLink = useDeleteLink(journalId)

  const [showForm, setShowForm] = useState(false)
  const [linkingOrder, setLinkingOrder] = useState<Order | null>(null)

  return (
    <div className="space-y-4">
      {orders.length === 0 ? (
        <p className="text-sm text-slate-400">No orders recorded for this journal yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onDelete={() => deleteOrder.mutate(order.id)}
              onLink={() => setLinkingOrder(order)}
              onUploadImage={(file) => uploadOrderImage.mutate({ orderId: order.id, file })}
              onDeleteLink={(linkId) => deleteLink.mutate(linkId)}
            />
          ))}
        </div>
      )}

      {showForm ? (
        <NewOrderForm
          onCancel={() => setShowForm(false)}
          onSubmit={async (payload) => {
            await createOrder.mutateAsync(payload)
            setShowForm(false)
          }}
          loading={createOrder.isPending}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50"
        >
          + Add order
        </button>
      )}

      {linkingOrder && (
        <LinkPickerModal
          journalId={journalId}
          order={linkingOrder}
          onClose={() => setLinkingOrder(null)}
        />
      )}
    </div>
  )
}

function OrderCard({
  order,
  onDelete,
  onLink,
  onUploadImage,
  onDeleteLink,
}: {
  order: Order
  onDelete: () => void
  onLink: () => void
  onUploadImage: (file: File) => void
  onDeleteLink: (linkId: number) => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const directionColor = order.direction === 'buy' ? 'text-emerald-600' : 'text-red-600'
  const allLinks = [...order.links_from, ...order.links_to]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold text-slate-900">{order.ticker}</span>
          <span className={`text-sm font-medium uppercase ${directionColor}`}>{order.direction}</span>
          <span className="text-sm text-slate-500">
            {order.quantity} @ ${order.price}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {order.status}
          </span>
          {order.open_quantity !== null && order.open_quantity < order.quantity && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {order.open_quantity} open
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <button type="button" onClick={onLink} className="font-medium text-slate-700 hover:underline">
            Link
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="font-medium text-slate-700 hover:underline"
          >
            + Image
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onUploadImage(file)
              e.target.value = ''
            }}
          />
          <button type="button" onClick={onDelete} className="font-medium text-red-600 hover:underline">
            Delete
          </button>
        </div>
      </div>

      {order.note && <p className="mt-2 text-sm text-slate-600">{order.note}</p>}

      {allLinks.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-slate-100 pt-2">
          {allLinks.map((link) => (
            <p key={link.id} className="flex items-center gap-2 text-xs text-slate-500">
              <span>
                Linked {link.quantity} shares
                {link.realized_pnl != null && (
                  <span className={link.realized_pnl >= 0 ? ' text-emerald-600' : ' text-red-600'}>
                    {' '}
                    (P&amp;L: {link.realized_pnl >= 0 ? '+' : ''}
                    {link.realized_pnl.toFixed(2)})
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => onDeleteLink(link.id)}
                className="text-red-500 hover:underline"
              >
                unlink
              </button>
            </p>
          ))}
        </div>
      )}

      {order.images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {order.images.map((img) => (
            <img
              key={img.id}
              src={imageUrl('order', img.id)}
              alt={img.filename}
              className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NewOrderForm({
  onCancel,
  onSubmit,
  loading,
}: {
  onCancel: () => void
  onSubmit: (payload: {
    ticker: string
    price: number
    quantity: number
    direction: Direction
    status: OrderStatus
    note?: string
  }) => void
  loading: boolean
}) {
  const [ticker, setTicker] = useState('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [direction, setDirection] = useState<Direction>('buy')
  const [status, setStatus] = useState<OrderStatus>('filled')
  const [note, setNote] = useState('')

  const canSubmit = ticker.trim() && price && quantity

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Ticker</label>
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Price</label>
          <input
            type="number"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Quantity</label>
          <input
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Direction</label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as Direction)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="filled">Filled</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div className="col-span-2 sm:col-span-3 lg:col-span-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Note</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={!canSubmit || loading}
          onClick={() =>
            onSubmit({
              ticker: ticker.trim(),
              price: Number(price),
              quantity: Number(quantity),
              direction,
              status,
              note: note.trim() || undefined,
            })
          }
          className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Add order
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

function LinkPickerModal({
  journalId,
  order,
  onClose,
}: {
  journalId: number
  order: Order
  onClose: () => void
}) {
  const { data: candidates, isLoading } = useLinkableOrders(order.ticker, order.id)
  const createLink = useCreateLink(journalId)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState('')

  const opposite = candidates?.filter((c) => c.direction !== order.direction) ?? []
  const orderOpenQty = order.open_quantity ?? order.quantity

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
        <h4 className="mb-1 text-base font-semibold text-slate-900">
          Link {order.ticker} {order.direction} order
        </h4>
        <p className="mb-4 text-sm text-slate-500">
          Open quantity on this order: {orderOpenQty}. Pick an opposite-direction order on the same
          ticker to link (e.g. a sell that closes an earlier buy).
        </p>

        {isLoading ? (
          <p className="text-sm text-slate-400">Loading candidates…</p>
        ) : opposite.length === 0 ? (
          <p className="text-sm text-slate-400">
            No open {order.direction === 'buy' ? 'sell' : 'buy'} orders on {order.ticker} to link to.
          </p>
        ) : (
          <div className="mb-4 max-h-48 space-y-2 overflow-y-auto">
            {opposite.map((c) => (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                  selectedId === c.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
                }`}
              >
                <span>
                  {c.direction.toUpperCase()} {c.quantity} @ ${c.price} — open {c.open_quantity}
                </span>
                <input
                  type="radio"
                  name="link-candidate"
                  checked={selectedId === c.id}
                  onChange={() => setSelectedId(c.id)}
                />
              </label>
            ))}
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-slate-500">Quantity to link</label>
          <input
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedId || !quantity || createLink.isPending}
            onClick={async () => {
              if (!selectedId) return
              await createLink.mutateAsync({
                fromOrderId: order.id,
                toOrderId: selectedId,
                quantity: Number(quantity),
              })
              onClose()
            }}
            className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Link
          </button>
        </div>
      </div>
    </div>
  )
}
