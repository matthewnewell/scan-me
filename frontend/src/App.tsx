import { Route, Routes } from 'react-router-dom'
import Nav from './components/Nav'
import SplashPage from './pages/SplashPage'
import ScanPage from './pages/ScanPage'
import ScanDetailPage from './pages/ScanDetailPage'
import './App.css'

/** Shared chrome for every operational page — same pattern as the sibling apps: the splash
 * page renders its own Nav directly, everything else gets it via this layout. */
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <Nav />
      <div className="app-layout__body">{children}</div>
    </div>
  )
}

export default function App() {
  return (
    <>
      <Routes>
      <Route path="/about" element={<SplashPage />} />
      <Route path="/" element={<Layout><ScanPage /></Layout>} />
      <Route path="/scans/:scanId" element={<Layout><ScanDetailPage /></Layout>} />
      </Routes>
    </>
  )
}
