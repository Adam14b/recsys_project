import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import MovieCard from '../components/MovieCard'

interface Movie {
  tmdb_id: number
  title: string
  poster_url?: string
  user_like?: number
  overview?: string
  genres?: string
}

function MyRatings() {
  const [likedMovies, setLikedMovies] = useState<Movie[]>([])
  const [dislikedMovies, setDislikedMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'liked' | 'disliked'>('liked')
  const navigate = useNavigate()

  useEffect(() => {
    const loadUserRatings = async () => {
      try {
        setLoading(true)
        
        // Получаем лайки пользователя
        const likesResponse = await axios.get('/api/user-likes')
        const userLikes = likesResponse.data.likes
        
        if (userLikes.length === 0) {
          setLoading(false)
          return
        }

        // Получаем информацию о фильмах
        const [popularResponse, newResponse] = await Promise.all([
          axios.get('/api/popular'),
          axios.get('/api/new')
        ])
        
        const allMovies = [...popularResponse.data, ...newResponse.data]
        
        // Фильтруем фильмы по лайкам
        const liked: Movie[] = []
        const disliked: Movie[] = []
        
        userLikes.forEach((like: {tmdb_id: number, value: number}) => {
          const movie = allMovies.find(m => m.tmdb_id === like.tmdb_id)
          if (movie) {
            const movieWithLike = {
              ...movie,
              poster_full: movie.poster_url,
              user_like: like.value
            }
            
            if (like.value === 1) {
              liked.push(movieWithLike)
            } else if (like.value === -1) {
              disliked.push(movieWithLike)
            }
          }
        })
        
        setLikedMovies(liked)
        setDislikedMovies(disliked)
        
      } catch (error) {
        console.error('Ошибка загрузки оценок:', error)
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }

    loadUserRatings()
  }, [navigate])

  const handleLike = async (tmdbId: number, value: number) => {
    try {
      await axios.post('/api/like', { tmdb_id: tmdbId, value: value })
      
      // Обновляем локальное состояние
      const updateMovies = (movies: Movie[]) => 
        movies.map(movie => 
          movie.tmdb_id === tmdbId 
            ? { ...movie, user_like: value }
            : movie
        )
      
      setLikedMovies(updateMovies)
      setDislikedMovies(updateMovies)
      
      // Перезагружаем данные для корректного отображения
      window.location.reload()
      
    } catch (error) {
      console.error('Ошибка обновления оценки:', error)
    }
  }

  const handleUnlike = async (tmdbId: number) => {
    try {
      await axios.post('/api/unlike', { tmdb_id: tmdbId })
      
      // Удаляем фильм из соответствующего списка
      setLikedMovies(prev => prev.filter(movie => movie.tmdb_id !== tmdbId))
      setDislikedMovies(prev => prev.filter(movie => movie.tmdb_id !== tmdbId))
      
    } catch (error) {
      console.error('Ошибка удаления оценки:', error)
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
            Мои оценки
          </h1>
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

        {/* Табы */}
        <div style={{
          display: 'flex',
          marginBottom: '30px',
          gap: '10px'
        }}>
          <button
            onClick={() => setActiveTab('liked')}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'liked' ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
              color: '#f8fafc',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            👍 Понравившиеся ({likedMovies.length})
          </button>
          <button
            onClick={() => setActiveTab('disliked')}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'disliked' ? '#ef4444' : 'rgba(255, 255, 255, 0.1)',
              color: '#f8fafc',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            👎 Не понравившиеся ({dislikedMovies.length})
          </button>
        </div>

        {/* Контент */}
        <div className="movie-grid">
          {activeTab === 'liked' ? (
            likedMovies.length > 0 ? (
              likedMovies.map(movie => (
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
                Вы пока не лайкнули ни одного фильма
              </div>
            )
          ) : (
            dislikedMovies.length > 0 ? (
              dislikedMovies.map(movie => (
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
                Вы пока не дизлайкнули ни одного фильма
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default MyRatings 