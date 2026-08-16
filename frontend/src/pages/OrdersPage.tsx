import { useState } from 'react'
import { useOrders } from '../api/hooks'

const PAGE_SIZE = 20

export function OrdersPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useOrders(page, PAGE_SIZE)

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Orders</h2>
        <p className="mt-1 text-sm text-slate-500">Every order across all journals, most recent first.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : !data || data.items.length === 0 ? (
        <p className="text-sm text-slate-400">No orders recorded yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Ticker</th>
                <th className="px-4 py-2">Tags</th>
                <th className="px-4 py-2">Position</th>
                <th className="px-4 py-2">Direction</th>
                <th className="px-4 py-2">Price</th>
                <th className="px-4 py-2">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((o) => {
                const shown = o.tags.slice(0, 3)
                const extra = o.tags.length - shown.length
                return (
                  <tr key={o.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-2 font-medium text-slate-900">{o.date}</td>
                    <td className="px-4 py-2 font-medium text-slate-900">{o.ticker}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        {shown.map((t) => (
                          <span
                            key={t.id}
                            className="rounded-full bg-slate-700 px-2 py-0.5 text-xs font-medium text-white"
                          >
                            {t.name}
                          </span>
                        ))}
                        {extra > 0 && (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                            +{extra}
                          </span>
                        )}
                        {o.tags.length === 0 && <span className="text-xs text-slate-300">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                          o.position_type === 'long'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {o.position_type}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-sm font-medium uppercase ${
                          o.direction === 'buy' ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {o.direction}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">${o.price}</td>
                    <td className="px-4 py-2 text-slate-600">{o.quantity}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {data.page} of {totalPages} ({data.total} order{data.total === 1 ? '' : 's'})
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
