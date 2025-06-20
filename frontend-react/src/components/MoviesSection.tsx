import { useState, useEffect } from 'react'
import axios from 'axios'
import MovieCard from './MovieCard'
import LoadingSkeleton from './LoadingSkeleton'

interface Movie {
  tmdb_id: number
  title: string
  poster_url?: string
  user_like?: number
}

interface MoviesSectionProps {
  title: string
  endpoint: string
  icon: string
}

function MoviesSection({ title, endpoint, icon }: MoviesSectionProps) {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLikes, setUserLikes] = useState<{[key: number]: number}>({})

  // Загружаем лайки пользователя
  useEffect(() => {
    const loadUserLikes = async () => {
      try {
        const response = await axios.get('/api/user-likes')
        const likesMap: {[key: number]: number} = {}
        response.data.likes.forEach((like: {tmdb_id: number, value: number}) => {
          likesMap[like.tmdb_id] = like.value
        })
        setUserLikes(likesMap)
      } catch (err) {
        console.log('Не удалось загрузить лайки пользователя (возможно, не авторизован)')
      }
    }
    loadUserLikes()
  }, [])

  useEffect(() => {
    const loadMovies = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await axios.get(endpoint)
        if (Array.isArray(response.data)) {
          // Применяем лайки пользователя к фильмам
          const moviesWithLikes = response.data.slice(0, 10).map((movie: any) => ({
            ...movie,
            poster_full: movie.poster_url, // Переименовываем для совместимости
            user_like: userLikes[movie.tmdb_id] || 0
          }))
          setMovies(moviesWithLikes)
        } else {
          console.error("API did not return an array:", response.data);
          setError('Ошибка: получен неверный формат данных от сервера.')
          setMovies([])
        }
      } catch (err) {
        setError('Ошибка загрузки фильмов')
        console.error('Error loading movies:', err)
        setMovies([])
      } finally {
        setLoading(false)
      }
    }
    loadMovies()
  }, [endpoint, userLikes])

  const handleLike = async (tmdbId: number, value: number) => {
    try {
      await axios.post('/api/like', { tmdb_id: tmdbId, value: value })
      // Обновляем локальное состояние лайков
      setUserLikes(prev => ({
        ...prev,
        [tmdbId]: value
      }))
      // Обновляем состояние фильма
      setMovies(prevMovies => 
        prevMovies.map(movie => 
          movie.tmdb_id === tmdbId 
            ? { ...movie, user_like: value }
            : movie
        )
      )
    } catch (err) {
      console.error('Ошибка оценки фильма:', err)
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
      // Обновляем состояние фильма
      setMovies(prevMovies => 
        prevMovies.map(movie => 
          movie.tmdb_id === tmdbId 
            ? { ...movie, user_like: 0 }
            : movie
        )
      )
    } catch (err) {
      console.error('Ошибка удаления оценки фильма:', err)
    }
  }

  return (
    <section className="my-5">
      <div className="section-title">{icon} {title}</div>
      {error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div className="movie-grid">
          {loading ? (
            Array(10).fill(0).map((_, index) => (
              <LoadingSkeleton key={index} />
            ))
          ) : (
            Array.isArray(movies) && movies.map(movie => (
              <MovieCard 
                key={movie.tmdb_id} 
                movie={movie} 
                onLike={handleLike}
                onUnlike={handleUnlike}
              />
            ))
          )}
        </div>
      )}
    </section>
  )
}

export default MoviesSection 