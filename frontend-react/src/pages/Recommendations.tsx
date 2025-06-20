import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import MovieCard from '../components/MovieCard'

interface Movie {
  tmdb_id: number
  title: string
  poster_url?: string
  poster_full?: string
  user_like?: number
  overview?: string
  genres?: string
}

function Recommendations() {
  const [recommendations, setRecommendations] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLikes, setUserLikes] = useState<{[key: number]: number}>({})
  const [algorithmUsed, setAlgorithmUsed] = useState<string>('popular')
  const navigate = useNavigate()

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Загружаем умные рекомендации и лайки пользователя параллельно
        const [recommendationsResponse, likesResponse] = await Promise.all([
          axios.get('/api/smart-recommendations'),
          axios.get('/api/user-likes')
        ])

        // Создаём карту лайков для быстрого поиска
        const likesMap: {[key: number]: number} = {}
        likesResponse.data.likes.forEach((like: {tmdb_id: number, value: number}) => {
          likesMap[like.tmdb_id] = like.value
        })
        setUserLikes(likesMap)

        // Устанавливаем рекомендации
        const movies = recommendationsResponse.data.movies || []
        setRecommendations(movies.map((movie: any) => ({
          ...movie,
          poster_full: movie.poster_url,
          user_like: likesMap[movie.tmdb_id] || 0
        })))
        
        setAlgorithmUsed(recommendationsResponse.data.algorithm_used || 'popular')
        
        if (recommendationsResponse.data.error) {
          setError(recommendationsResponse.data.error)
        }
        
      } catch (error) {
        console.error('Ошибка загрузки рекомендаций:', error)
        setError('Не удалось загрузить рекомендации')
      } finally {
        setLoading(false)
      }
    }

    loadRecommendations()
  }, [])

  const handleLike = async (tmdbId: number, value: number) => {
    try {
      await axios.post('/api/like', { tmdb_id: tmdbId, value: value })
      
      // Обновляем локальное состояние лайков
      setUserLikes(prev => ({
        ...prev,
        [tmdbId]: value
      }))
      
      // Обновляем состояние рекомендаций
      setRecommendations(prevMovies => 
        prevMovies.map(movie => 
          movie.tmdb_id === tmdbId 
            ? { ...movie, user_like: value }
            : movie
        )
      )
    } catch (error) {
      console.error('Ошибка оценки фильма:', error)
    }
  }

  const handleUnlike = async (tmdbId: number) => {
    try {
      await axios.post('/api/unlike', { tmdb_id: tmdbId })
      
      // Удаляем лайк из локального состояния
      setUserLikes(prev => {
        const newLikes = { ...prev }
        delete newLikes[tmdbId]
        return newLikes
      })
      
      // Обновляем состояние рекомендаций
      setRecommendations(prevMovies => 
        prevMovies.map(movie => 
          movie.tmdb_id === tmdbId 
            ? { ...movie, user_like: 0 }
            : movie
        )
      )
    } catch (error) {
      console.error('Ошибка удаления оценки фильма:', error)
    }
  }

  const getAlgorithmInfo = (algorithm: string) => {
    switch (algorithm) {
      case 'content':
        return {
          icon: '🎬',
          name: 'Контентные рекомендации',
          description: 'На основе содержания фильмов, которые вам понравились'
        }
      case 'collaborative':
        return {
          icon: '👥',
          name: 'Коллаборативные рекомендации',
          description: 'На основе предпочтений похожих пользователей'
        }
      case 'hybrid':
        return {
          icon: '🚀',
          name: 'Гибридные рекомендации',
          description: 'Комбинация контентных и коллаборативных алгоритмов'
        }
      case 'popular':
      default:
        return {
          icon: '🔥',
          name: 'Популярные фильмы',
          description: 'Самые популярные фильмы среди всех пользователей'
        }
    }
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
      }}>
        <div className="loading-skeleton" style={{ width: '50px', height: '50px', borderRadius: '50%' }}></div>
      </div>
    )
  }

  const algorithmInfo = getAlgorithmInfo(algorithmUsed)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px'
        }}>
          <h1 style={{
            color: '#f8fafc',
            fontSize: '2.5rem',
            fontWeight: '600',
            margin: 0
          }}>
            🎯 Рекомендации для вас
          </h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => navigate('/settings')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                background: 'rgba(245, 158, 11, 0.1)',
                color: '#f59e0b',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ⚙️ Настройки
            </button>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              На главную
            </button>
          </div>
        </div>

        {/* Информация об используемом алгоритме */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '30px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '2rem', marginRight: '12px' }}>{algorithmInfo.icon}</span>
            <h2 style={{ 
              color: '#93c5fd', 
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: '600'
            }}>
              {algorithmInfo.name}
            </h2>
          </div>
          <p style={{ 
            color: '#cbd5e1', 
            margin: 0,
            fontSize: '1.1rem'
          }}>
            {algorithmInfo.description}
          </p>
          {error && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: '#f87171',
              fontSize: '0.9rem'
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Рекомендации */}
        <div className="movie-grid">
          {recommendations.length > 0 ? (
            recommendations.map(movie => (
              <MovieCard 
                key={movie.tmdb_id} 
                movie={movie} 
                onLike={handleLike}
                onUnlike={handleUnlike}
              />
            ))
          ) : (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              color: '#cbd5e1',
              fontSize: '1.2rem',
              padding: '40px'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎬</div>
              <p>Пока нет рекомендаций</p>
              <p style={{ fontSize: '1rem', opacity: 0.7, marginBottom: '20px' }}>
                Оцените несколько фильмов на главной странице, чтобы получить персональные рекомендации
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => navigate('/')}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Перейти к фильмам
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    background: 'rgba(245, 158, 11, 0.1)',
                    color: '#f59e0b',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Настроить алгоритм
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Recommendations 