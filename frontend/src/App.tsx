import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { JournalsPage } from './pages/JournalsPage'
import { JournalDetailPage } from './pages/JournalDetailPage'
import { OrdersPage } from './pages/OrdersPage'
import { PnlPage } from './pages/PnlPage'
import { CalculatorPage } from './pages/CalculatorPage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/journals" element={<JournalsPage />} />
                  <Route path="/journals/:id" element={<JournalDetailPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/pnl" element={<PnlPage />} />
                  <Route path="/calculator" element={<CalculatorPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  )
}

export default App
