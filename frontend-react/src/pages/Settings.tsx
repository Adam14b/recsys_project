import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface UserSettings {
  recommendation_algorithm: string;
  content_weight: number;
  collaborative_weight: number;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>({
    recommendation_algorithm: 'hybrid',
    content_weight: 0.6,
    collaborative_weight: 0.4
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await axios.get('/api/user-settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
      setMessage('Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      await axios.post('/api/user-settings', settings);
      setMessage('✅ Настройки сохранены успешно!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error);
      setMessage('❌ Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleAlgorithmChange = (algorithm: string) => {
    setSettings(prev => ({
      ...prev,
      recommendation_algorithm: algorithm
    }));
  };

  const handleWeightChange = (type: 'content' | 'collaborative', value: number) => {
    const otherValue = 1 - value;
    setSettings(prev => ({
      ...prev,
      content_weight: type === 'content' ? value : otherValue,
      collaborative_weight: type === 'content' ? otherValue : value
    }));
  };

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
        maxWidth: '900px',
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
            ⚙️ Настройки рекомендаций
          </h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => navigate('/recommendations')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                background: 'rgba(168, 85, 247, 0.1)',
                color: '#a855f7',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🎯 Рекомендации
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

        {/* Описание */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
          textAlign: 'center'
        }}>
          <h2 style={{
            color: '#f8fafc',
            fontSize: '1.8rem',
            marginBottom: '12px'
          }}>
            🤖 Персонализируйте свои рекомендации
          </h2>
          <p style={{ 
            color: '#cbd5e1', 
            fontSize: '1rem',
            margin: 0
          }}>
            Выберите алгоритм машинного обучения для получения максимально точных рекомендаций фильмов
          </p>
        </div>

        {/* Алгоритмы */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          {/* Популярные */}
          <div 
            style={{
              background: settings.recommendation_algorithm === 'popular' 
                ? 'rgba(245, 158, 11, 0.15)' 
                : 'rgba(245, 158, 11, 0.1)',
              border: settings.recommendation_algorithm === 'popular'
                ? '2px solid rgba(245, 158, 11, 0.5)'
                : '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative'
            }}
            onClick={() => handleAlgorithmChange('popular')}
          >
            {settings.recommendation_algorithm === 'popular' && (
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '24px',
                height: '24px',
                background: '#10b981',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                ✓
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '2rem', marginRight: '12px' }}>🔥</span>
              <h3 style={{
                color: '#f59e0b',
                fontSize: '1.3rem',
                margin: 0
              }}>
                Популярные
              </h3>
            </div>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0 }}>
              Показывает самые популярные и высоко оценённые фильмы среди всех пользователей. 
              Отличный выбор для знакомства с лучшими фильмами.
            </p>
          </div>

          {/* Контентные */}
          <div 
            style={{
              background: settings.recommendation_algorithm === 'content' 
                ? 'rgba(16, 185, 129, 0.15)' 
                : 'rgba(16, 185, 129, 0.1)',
              border: settings.recommendation_algorithm === 'content'
                ? '2px solid rgba(16, 185, 129, 0.5)'
                : '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative'
            }}
            onClick={() => handleAlgorithmChange('content')}
          >
            {settings.recommendation_algorithm === 'content' && (
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '24px',
                height: '24px',
                background: '#10b981',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                ✓
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '2rem', marginRight: '12px' }}>🎬</span>
              <h3 style={{
                color: '#10b981',
                fontSize: '1.3rem',
                margin: 0
              }}>
                По содержанию
              </h3>
            </div>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0 }}>
              Анализирует жанры, сюжет, актёров и режиссёров фильмов, которые вам понравились, 
              и находит похожие произведения.
            </p>
          </div>

          {/* Коллаборативные */}
          <div 
            style={{
              background: settings.recommendation_algorithm === 'collaborative' 
                ? 'rgba(59, 130, 246, 0.15)' 
                : 'rgba(59, 130, 246, 0.1)',
              border: settings.recommendation_algorithm === 'collaborative'
                ? '2px solid rgba(59, 130, 246, 0.5)'
                : '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative'
            }}
            onClick={() => handleAlgorithmChange('collaborative')}
          >
            {settings.recommendation_algorithm === 'collaborative' && (
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '24px',
                height: '24px',
                background: '#10b981',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                ✓
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '2rem', marginRight: '12px' }}>👥</span>
              <h3 style={{
                color: '#3b82f6',
                fontSize: '1.3rem',
                margin: 0
              }}>
                По пользователям
              </h3>
            </div>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0 }}>
              Использует машинное обучение для поиска пользователей с похожими вкусами 
              и рекомендует их любимые фильмы.
            </p>
          </div>

          {/* Гибридные */}
          <div 
            style={{
              background: settings.recommendation_algorithm === 'hybrid' 
                ? 'rgba(168, 85, 247, 0.15)' 
                : 'rgba(168, 85, 247, 0.1)',
              border: settings.recommendation_algorithm === 'hybrid'
                ? '2px solid rgba(168, 85, 247, 0.5)'
                : '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative'
            }}
            onClick={() => handleAlgorithmChange('hybrid')}
          >
            {/* Бейдж "ЛУЧШИЙ" */}
            <div style={{
              position: 'absolute',
              top: '-8px',
              right: '12px',
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              color: '#000',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              padding: '4px 8px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}>
              ЛУЧШИЙ
            </div>
            
            {settings.recommendation_algorithm === 'hybrid' && (
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                width: '24px',
                height: '24px',
                background: '#10b981',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                ✓
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '2rem', marginRight: '12px' }}>🚀</span>
              <h3 style={{
                color: '#a855f7',
                fontSize: '1.3rem',
                margin: 0
              }}>
                Гибридный
              </h3>
            </div>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0 }}>
              Комбинирует все методы машинного обучения для максимально точных 
              и разнообразных рекомендаций.
            </p>
          </div>
        </div>

        {/* Тонкая настройка для гибридного алгоритма */}
        {settings.recommendation_algorithm === 'hybrid' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '32px'
          }}>
            <h3 style={{
              color: '#f8fafc',
              fontSize: '1.5rem',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              ⚖️ Тонкая настройка
            </h3>
            <p style={{
              color: '#cbd5e1',
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              Настройте баланс между различными алгоритмами рекомендаций
            </p>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px'
            }}>
              {/* Контентные рекомендации */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '1.5rem', marginRight: '12px' }}>🎬</span>
                  <div>
                    <h4 style={{
                      color: '#10b981',
                      fontSize: '1.1rem',
                      margin: 0,
                      marginBottom: '4px'
                    }}>
                      По содержанию
                    </h4>
                    <p style={{ color: '#cbd5e1', fontSize: '0.8rem', margin: 0 }}>
                      Анализ фильмов
                    </p>
                  </div>
                </div>
                
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <div style={{
                    color: '#10b981',
                    fontSize: '2rem',
                    fontWeight: 'bold'
                  }}>
                    {Math.round(settings.content_weight * 100)}%
                  </div>
                </div>
                
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.1"
                  value={settings.content_weight}
                  onChange={(e) => handleWeightChange('content', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* Коллаборативные рекомендации */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '1.5rem', marginRight: '12px' }}>👥</span>
                  <div>
                    <h4 style={{
                      color: '#3b82f6',
                      fontSize: '1.1rem',
                      margin: 0,
                      marginBottom: '4px'
                    }}>
                      По пользователям
                    </h4>
                    <p style={{ color: '#cbd5e1', fontSize: '0.8rem', margin: 0 }}>
                      Машинное обучение
                    </p>
                  </div>
                </div>
                
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <div style={{
                    color: '#3b82f6',
                    fontSize: '2rem',
                    fontWeight: 'bold'
                  }}>
                    {Math.round(settings.collaborative_weight * 100)}%
                  </div>
                </div>
                
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.1"
                  value={settings.collaborative_weight}
                  onChange={(e) => handleWeightChange('collaborative', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Сообщения */}
        {message && (
          <div style={{
            background: message.includes('✅') 
              ? 'rgba(16, 185, 129, 0.1)' 
              : 'rgba(239, 68, 68, 0.1)',
            border: message.includes('✅')
              ? '1px solid rgba(16, 185, 129, 0.3)'
              : '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
            color: message.includes('✅') ? '#10b981' : '#ef4444',
            fontSize: '1rem'
          }}>
            {message}
          </div>
        )}

        {/* Кнопки действий */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={saveSettings}
            disabled={saving}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: saving 
                ? 'rgba(107, 114, 128, 0.5)'
                : 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {saving ? (
              <>
                <div className="loading-skeleton" style={{ width: '16px', height: '16px', borderRadius: '50%' }}></div>
                Сохранение...
              </>
            ) : (
              <>
                💾 Сохранить настройки
              </>
            )}
          </button>

          <button
            onClick={() => navigate('/recommendations')}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#f8fafc',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            🎯 К рекомендациям
          </button>
        </div>

        {/* Информационная панель */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '24px',
          marginTop: '32px'
        }}>
          <h3 style={{
            color: '#f8fafc',
            fontSize: '1.5rem',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            💡 Как работают алгоритмы?
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            <div>
              <h4 style={{ color: '#10b981', fontSize: '1.1rem', marginBottom: '8px' }}>
                🎬 Контентные рекомендации
              </h4>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0 }}>
                Анализируют описание, жанры, актёров и режиссёров фильмов, которые вам понравились, 
                и находят похожие по содержанию произведения.
              </p>
            </div>
            <div>
              <h4 style={{ color: '#3b82f6', fontSize: '1.1rem', marginBottom: '8px' }}>
                👥 Коллаборативные рекомендации
              </h4>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0 }}>
                Используют машинное обучение для поиска пользователей с похожими вкусами 
                и рекомендуют фильмы, которые им понравились.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 