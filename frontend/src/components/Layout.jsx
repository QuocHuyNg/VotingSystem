import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="page-content fade-in">
        {children}
      </main>
    </div>
  )
}
