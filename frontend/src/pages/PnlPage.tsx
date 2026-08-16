import { usePnl } from '../api/hooks'

export function PnlPage() {
  const { data, isLoading } = usePnl()

  if (isLoading || !data) {
    return <p className="text-sm text-slate-400">Loading…</p>
  }

  const totalColor = data.total_realized_pnl >= 0 ? 'text-emerald-600' : 'text-red-600'

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">Trades &amp; Profit / Loss</h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Realized P&amp;L</p>
          <p className={`mt-1 text-3xl font-semibold ${totalColor}`}>
            {data.total_realized_pnl >= 0 ? '+' : ''}
            {data.total_realized_pnl.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Closed Trades</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{data.closed_lot_count}</p>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Closed Lots</h3>
        {data.closed_lots.length === 0 ? (
          <p className="text-sm text-slate-400">
            No closed trades yet. Link a buy and sell order on the same ticker from a journal's detail page to
            record realized P&amp;L.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Ticker</th>
                  <th className="px-4 py-2">Qty</th>
                  <th className="px-4 py-2">Buy Price</th>
                  <th className="px-4 py-2">Sell Price</th>
                  <th className="px-4 py-2">Realized P&amp;L</th>
                  <th className="px-4 py-2">Closed At</th>
                </tr>
              </thead>
              <tbody>
                {data.closed_lots.map((lot) => (
                  <tr key={lot.link_id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2 font-medium text-slate-900">{lot.ticker}</td>
                    <td className="px-4 py-2 text-slate-600">{lot.quantity}</td>
                    <td className="px-4 py-2 text-slate-600">${lot.buy_price}</td>
                    <td className="px-4 py-2 text-slate-600">${lot.sell_price}</td>
                    <td className={`px-4 py-2 font-medium ${lot.realized_pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {lot.realized_pnl >= 0 ? '+' : ''}
                      {lot.realized_pnl.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-slate-500">{new Date(lot.closed_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
