interface Movie {
  tmdb_id: number
  title: string
  poster_full?: string
  poster_url?: string
  user_like?: number
}

interface MovieCardProps {
  movie: Movie
  onLike: (tmdbId: number, value: number) => void
  onUnlike?: (tmdbId: number) => void
}

function MovieCard({ movie, onLike, onUnlike }: MovieCardProps) {
  const handleLike = (value: number) => {
    // Если нажали на уже активную кнопку, убираем оценку
    if (movie.user_like === value && onUnlike) {
      onUnlike(movie.tmdb_id)
    } else {
      onLike(movie.tmdb_id, value)
    }
  }

  // Определяем URL постера
  const posterUrl = movie.poster_full || movie.poster_url

  return (
    <div className="movie-card">
      {posterUrl ? (
        <img 
          src={posterUrl} 
          className="movie-poster" 
          alt={movie.title || 'Фильм'}
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            const placeholder = target.nextElementSibling as HTMLElement
            if (placeholder) placeholder.style.display = 'flex'
          }}
        />
      ) : null}
      <div 
        className="poster-placeholder" 
        style={{ 
          display: posterUrl ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '300px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          fontSize: '3rem',
          borderRadius: '8px'
        }}
      >
        🎬
      </div>
      <div className="movie-info">
        <div className="movie-title">{movie.title || 'Неизвестное название'}</div>
        <div className="movie-actions">
          <button 
            className={`btn btn-modern ${movie.user_like === 1 ? 'btn-success' : 'btn-outline-success'}`}
            onClick={() => handleLike(1)}
            title={movie.user_like === 1 ? "Убрать лайк" : "Нравится"}
          >
            👍
          </button>
          <button 
            className={`btn btn-modern ${movie.user_like === -1 ? 'btn-danger' : 'btn-outline-danger'}`}
            onClick={() => handleLike(-1)}
            title={movie.user_like === -1 ? "Убрать дизлайк" : "Не нравится"}
          >
            👎
          </button>
        </div>
      </div>
    </div>
  )
}

export default MovieCard 