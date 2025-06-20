function LoadingSkeleton() {
  return (
    <div className="movie-card">
      <div className="loading-skeleton" style={{height: '300px'}}></div>
      <div className="movie-info">
        <div className="loading-skeleton" style={{height: '1rem', marginBottom: '1rem'}}></div>
        <div className="loading-skeleton" style={{height: '2rem'}}></div>
      </div>
    </div>
  )
}

export default LoadingSkeleton 