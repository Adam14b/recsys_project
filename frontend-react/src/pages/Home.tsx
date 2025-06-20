import { Link } from 'react-router-dom'
import MoviesSection from '../components/MoviesSection'

function Home() {
  return (
    <div>
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-dark">
        <div className="container">
          <Link className="navbar-brand fw-bold" to="/">
            🎬 Рекомендации фильмов
          </Link>
          <div className="navbar-nav ms-auto">
            <Link className="nav-link" to="/dashboard">Профиль</Link>
            <a className="nav-link" href="/logout">Выйти</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="container">
          <h1 className="hero-title">Откройте для себя кино</h1>
          <p className="hero-subtitle">
            Персональные рекомендации на основе ваших предпочтений и машинного обучения
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container">
        {/* Popular Movies */}
        <MoviesSection 
          title="Популярные фильмы" 
          endpoint="/api/popular" 
          icon="🔥"
        />

        {/* New Movies */}
        <MoviesSection 
          title="Новинки" 
          endpoint="/api/new" 
          icon="✨"
        />

        {/* Recommendations Form Section */}
        <div className="recommendations-section">
          <h3 className="mb-4">🎯 Персональные рекомендации</h3>
          <p className="text-muted mb-4">
            Получите рекомендации на основе коллаборативной фильтрации, 
            контентного анализа или гибридного подхода
          </p>
          <div className="text-center">
            <Link to="/recommendations" className="btn btn-primary btn-lg">
              Перейти к рекомендациям
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-5 mt-5">
        <div className="container">
          <p style={{ color: 'white' }}>
            Адаменко, Бова, Гапбаев, Саркисян 2025
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Home 