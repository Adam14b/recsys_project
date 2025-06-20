import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Fetch user profile data
    fetch('/api/profile', { credentials: 'include' })
      .then(response => {
        if (response.ok) {
          return response.json()
        } else {
          throw new Error('Not authenticated')
        }
      })
      .then(data => {
        setUser(data)
      })
      .catch(() => {
        navigate('/login')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [navigate])

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      })
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
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
        maxWidth: '800px',
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
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
            Профиль
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

        {user && (
          <div style={{ marginBottom: '40px' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <h2 style={{
                color: '#f8fafc',
                fontSize: '1.5rem',
                marginBottom: '16px'
              }}>
                Информация профиля
              </h2>
              <div style={{ color: '#cbd5e1' }}>
                <p><strong>Имя пользователя:</strong> {user.username}</p>
                {user.email && <p><strong>Email:</strong> {user.email}</p>}
                <p><strong>Участник с:</strong> {new Date(user.date_joined).toLocaleDateString('ru-RU')}</p>
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <h2 style={{
                color: '#f8fafc',
                fontSize: '1.5rem',
                marginBottom: '16px'
              }}>
                Активность
              </h2>
              <div style={{ color: '#cbd5e1' }}>
                <p><strong>Оценено фильмов:</strong> {user.likes_count || 0}</p>
                <p><strong>Просмотрено рекомендаций:</strong> {user.recommendations_viewed || 0}</p>
              </div>
            </div>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            padding: '24px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }} onClick={() => navigate('/')}>
            <h3 style={{
              color: '#3b82f6',
              fontSize: '1.2rem',
              marginBottom: '8px'
            }}>
              Просмотр фильмов
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
              Откройте новые фильмы и получите персональные рекомендации
            </p>
          </div>

          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '24px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }} onClick={() => navigate('/my-ratings')}>
            <h3 style={{
              color: '#10b981',
              fontSize: '1.2rem',
              marginBottom: '8px'
            }}>
              Мои оценки
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
              Просмотр и управление вашими оценками фильмов
            </p>
          </div>

          <div style={{
            background: 'rgba(168, 85, 247, 0.1)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '12px',
            padding: '24px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }} onClick={() => navigate('/recommendations')}>
            <h3 style={{
              color: '#a855f7',
              fontSize: '1.2rem',
              marginBottom: '8px'
            }}>
              Рекомендации
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
              Персональные рекомендации фильмов на основе ваших предпочтений
            </p>
          </div>

          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            padding: '24px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }} onClick={() => navigate('/settings')}>
            <h3 style={{
              color: '#f59e0b',
              fontSize: '1.2rem',
              marginBottom: '8px'
            }}>
              Настройки
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
              Настройте алгоритм рекомендаций под свои предпочтения
            </p>
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px'
        }}>
          <button
            onClick={handleLogout}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Выйти
          </button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 