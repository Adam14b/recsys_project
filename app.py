import os
import pickle
from datetime import datetime
from typing import Optional, Union

import numpy as np
import pandas as pd
from flask import (Flask, flash, jsonify, redirect, render_template, request,
                   url_for, Response, send_from_directory)
from flask_login import (LoginManager, UserMixin, current_user, login_required,
                         login_user, logout_user)
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash
import requests, re
import json

app = Flask(__name__, static_folder='frontend-react/dist', static_url_path='/')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev_secret_key')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

login_manager = LoginManager(app)
login_manager.login_view = 'login'

db = SQLAlchemy(app)

@app.context_processor
def inject_now():
    return {'datetime': datetime}

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=True)
    password_hash = db.Column(db.String(256), nullable=False)
    date_joined = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)


class Like(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    tmdb_id = db.Column(db.Integer, nullable=False)
    value = db.Column(db.Integer, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('user_id', 'tmdb_id', name='unique_user_movie_like'),)


class UserSettings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, unique=True)
    recommendation_algorithm = db.Column(db.String(50), default='hybrid')
    content_weight = db.Column(db.Float, default=0.6)
    collaborative_weight = db.Column(db.Float, default=0.4)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('settings', uselist=False))


with app.app_context():
    db.create_all()

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "streamlit_data")
MOVIES_DATA_PATH = os.path.join(DATA_DIR, "movies_data.pkl")
CONTENT_SIMILARITY_PATH = os.path.join(DATA_DIR, "content_similarity_matrix.pkl")
CB_INDICES_PATH = os.path.join(DATA_DIR, "cb_movie_indices.pkl")
SVD_MODEL_PATH = os.path.join(DATA_DIR, "svd_model.pkl")
RATINGS_DATA_PATH = os.path.join(DATA_DIR, "ratings_data_filtered.pkl")
POPULAR_MOVIES_PATH = os.path.join(DATA_DIR, "popular_movies.pkl")
MOVIES_CB_DF_PATH = os.path.join(DATA_DIR, "movies_cb_df.pkl")
SVD_EVAL_METRICS_PATH = os.path.join(DATA_DIR, "svd_evaluation_metrics.pkl")
NEW_ITEMS_COLD_START_PATH = os.path.join(DATA_DIR, "new_items_for_cold_start.pkl")

GENRE_EMOJIS = {
    "Action": "💥", "Adventure": "🗺️", "Animation": "🎨", "Comedy": "😂",
    "Crime": "🕵️", "Documentary": "📄", "Drama": "🎭", "Family": "👨‍👩‍👧‍👦",
    "Fantasy": "🧙", "History": "📜", "Horror": "👻", "Music": "🎵",
    "Mystery": "❓", "Romance": "💕", "Science Fiction": "🚀", "Sci-Fi": "🚀",
    "TV Movie": "📺", "Thriller": "🔪", "War": "⚔️", "Western": "🤠",
    "Default": "🎬"
}

def load_data_from_pickle(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Data file not found: {path}")
    try:
        return pd.read_pickle(path)
    except Exception:
        with open(path, "rb") as f:
            return pickle.load(f)


def load_all_resources():
    global movies_df, cosine_sim_content, cb_indices, svd_model, ratings_df_processed
    global popular_movies_df, movies_cb_df_for_recs, svd_eval_metrics, new_items_cold_start_df

    movies_df = load_data_from_pickle(MOVIES_DATA_PATH)
    LINKS_ENRICHED_PATH = os.path.join(DATA_DIR, "links_with_posters.parquet")
    if os.path.exists(LINKS_ENRICHED_PATH):
        try:
            links_enriched = pd.read_parquet(LINKS_ENRICHED_PATH)
            links_enriched["tmdbId"] = pd.to_numeric(links_enriched["tmdbId"], errors="coerce").astype("Int64")
            movies_df = movies_df.merge(
                links_enriched[["tmdbId", "imdbId", "local_poster"]].rename(columns={"tmdbId": "tmdb_id"}),
                on="tmdb_id",
                how="left"
            )
        except Exception as merge_err:
            print(f"[WARN] Не удалось объединить links_with_posters.parquet: {merge_err}")
    cosine_sim_content = load_data_from_pickle(CONTENT_SIMILARITY_PATH)
    cb_indices = load_data_from_pickle(CB_INDICES_PATH)
    svd_model = load_data_from_pickle(SVD_MODEL_PATH)
    ratings_df_original = load_data_from_pickle(RATINGS_DATA_PATH)
    popular_movies_df = load_data_from_pickle(POPULAR_MOVIES_PATH)
    movies_cb_df_for_recs = load_data_from_pickle(MOVIES_CB_DF_PATH)

    svd_eval_metrics = load_data_from_pickle(SVD_EVAL_METRICS_PATH)
    new_items_cold_start_df = load_data_from_pickle(NEW_ITEMS_COLD_START_PATH)

    movies_df['tmdb_id'] = pd.to_numeric(movies_df['tmdb_id'], errors='coerce').astype('Int64')
    if 'movieId_ml' in movies_df.columns:
        movies_df['movieId_ml'] = pd.to_numeric(movies_df['movieId_ml'], errors='coerce').astype('Int64')

    ratings_df_processed = ratings_df_original.copy()
    if 'movieId_ml' in ratings_df_processed.columns:
        ratings_df_processed['movieId_ml'] = pd.to_numeric(ratings_df_processed['movieId_ml'], errors='coerce').astype('Int64')
    if 'userId' in ratings_df_processed.columns:
        ratings_df_processed['userId'] = pd.to_numeric(ratings_df_processed['userId'], errors='coerce').astype('Int64')


try:
    load_all_resources()
except Exception as e:
    print(f"[ERROR] Failed to load resources: {e}")
    raise

def get_content_recommendations(title: str, top_n: int = 10) -> pd.DataFrame:
    if title not in cb_indices:
        return pd.DataFrame(columns=['title', 'tmdb_id', 'poster_path', 'overview', 'genres'])

    idx = cb_indices[title]
    sim_scores = list(enumerate(cosine_sim_content[idx]))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)[1:top_n+1]
    movie_indices = [i[0] for i in sim_scores]

    recommended_cb_info = movies_cb_df_for_recs.iloc[movie_indices].copy()
    recommended_cb_info['tmdb_id'] = pd.to_numeric(recommended_cb_info['tmdb_id'], errors='coerce').astype('Int64')

    full_recommendations = pd.merge(
        recommended_cb_info[['title', 'tmdb_id']],
        movies_df[['tmdb_id', 'poster_path', 'overview', 'genres']],
        on='tmdb_id', how='left'
    ).drop_duplicates(subset=['tmdb_id'])

    ordered_tmdb_ids = recommended_cb_info['tmdb_id']
    if not ordered_tmdb_ids.empty:
        full_recommendations = full_recommendations.set_index('tmdb_id').loc[ordered_tmdb_ids].reset_index()

    return full_recommendations[['title', 'tmdb_id', 'poster_path', 'overview', 'genres']]


def get_collaborative_recommendations(user_id: int, top_n: int = 10) -> pd.DataFrame:
    user_rated_movies_ml = ratings_df_processed[ratings_df_processed['userId'] == user_id]['movieId_ml'].unique()
    all_movies_ml_with_metadata = movies_df.loc[
        movies_df['movieId_ml'].notna() & movies_df['movieId_ml'].isin(ratings_df_processed['movieId_ml'].unique()),
        'movieId_ml'
    ].unique()
    movies_to_predict_ml = [mid for mid in all_movies_ml_with_metadata if mid not in user_rated_movies_ml]

    if not movies_to_predict_ml:
        return pd.DataFrame(columns=['title', 'tmdb_id', 'poster_path', 'overview', 'genres'])

    predictions = []
    for movie_id_ml in movies_to_predict_ml:
        try:
            pred = svd_model.predict(uid=int(user_id), iid=float(movie_id_ml))
            predictions.append(pred)
        except Exception:
            continue

    predictions.sort(key=lambda x: x.est, reverse=True)
    recommended_movie_ids_ml = [pred.iid for pred in predictions[:top_n]]

    recommended_movies_info = movies_df[movies_df['movieId_ml'].isin(recommended_movie_ids_ml)].copy()
    if recommended_movies_info.empty:
        return pd.DataFrame(columns=['title', 'tmdb_id', 'poster_path', 'overview', 'genres'])

    present_ids = [mid for mid in recommended_movie_ids_ml if mid in recommended_movies_info['movieId_ml'].values]
    if present_ids:
        recommended_movies_info_sorted = recommended_movies_info.set_index('movieId_ml').loc[present_ids].reset_index()
        return recommended_movies_info_sorted[['title', 'tmdb_id', 'poster_path', 'overview', 'genres']]
    return pd.DataFrame(columns=['title', 'tmdb_id', 'poster_path', 'overview', 'genres'])


def get_hybrid_recommendations(user_id: int, liked_movie_title: str, top_n: int = 10, cb_weight: float = 0.6, cf_weight: float = 0.4) -> pd.DataFrame:
    cb_recs = get_content_recommendations(liked_movie_title, top_n=top_n * 2)
    cb_scores_df = cb_recs[['tmdb_id']].copy()
    if not cb_scores_df.empty:
        cb_scores_df['score_cb'] = np.linspace(1, 0.1, len(cb_scores_df))

    cf_recs = get_collaborative_recommendations(user_id, top_n=top_n * 2)
    cf_scores_df = cf_recs[['tmdb_id']].copy()
    if not cf_scores_df.empty:
        cf_scores_df['score_cf'] = np.linspace(1, 0.1, len(cf_scores_df))

    if cb_scores_df.empty and cf_scores_df.empty:
        return pd.DataFrame(columns=['title', 'tmdb_id', 'poster_path', 'overview', 'genres'])

    hybrid_df = pd.merge(cb_scores_df, cf_scores_df, on='tmdb_id', how='outer')
    hybrid_df['score_cb'] = hybrid_df.get('score_cb', 0).fillna(0)
    hybrid_df['score_cf'] = hybrid_df.get('score_cf', 0).fillna(0)
    hybrid_df['score_hybrid'] = hybrid_df['score_cb'] * cb_weight + hybrid_df['score_cf'] * cf_weight
    hybrid_df.sort_values('score_hybrid', ascending=False, inplace=True)

    top_n_hybrid_df = hybrid_df.head(top_n)
    final_recs = pd.merge(top_n_hybrid_df[['tmdb_id', 'score_hybrid']],
                          movies_df[['tmdb_id', 'title', 'poster_path', 'overview', 'genres']],
                          on='tmdb_id', how='left').sort_values('score_hybrid', ascending=False)

    return final_recs[['title', 'tmdb_id', 'poster_path', 'overview', 'genres']]

@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not all([username, email, password]):
        return jsonify({'status': 'error', 'message': 'Все поля обязательны для заполнения'}), 400

    if User.query.filter_by(username=username).first() or User.query.filter_by(email=email).first():
        return jsonify({'status': 'error', 'message': 'Пользователь или email уже существует'}), 409

    new_user = User(username=username, email=email)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Пользователь успешно зарегистрирован'})


@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        login_user(user, remember=True)
        return jsonify({'status': 'success'})
    return jsonify({'status': 'error', 'message': 'Неверные учетные данные'}), 401


@app.route('/api/check-auth')
def api_check_auth():
    return jsonify({'is_authenticated': current_user.is_authenticated})


@app.route('/api/profile')
@login_required
def api_profile():
    likes_count = Like.query.filter_by(user_id=current_user.id).count()
    print(f"User {current_user.id} ({current_user.username}) has {likes_count} likes")
    
    all_likes = Like.query.all()
    print(f"Total likes in database: {len(all_likes)}")
    for like in all_likes:
        print(f"Like: user_id={like.user_id}, tmdb_id={like.tmdb_id}, value={like.value}")
    
    return jsonify({
        'username': current_user.username,
        'email': current_user.email,
        'date_joined': current_user.date_joined.strftime('%Y-%m-%d %H:%M:%S'),
        'likes_count': likes_count
    })

@app.route('/api/logout', methods=['POST'])
@login_required
def api_logout():
    logout_user()
    return jsonify({'status': 'success'})

@app.route('/api/like', methods=['POST'])
@login_required
def api_like():
    data = request.json
    tmdb_id = data.get('tmdb_id')
    value = data.get('value')

    if not tmdb_id or value not in [1, -1]:
        return jsonify({'status': 'error', 'message': 'Неверный запрос'}), 400

    like = Like.query.filter_by(user_id=current_user.id, tmdb_id=tmdb_id).first()
    if like:
        like.value = value
    else:
        like = Like(user_id=current_user.id, tmdb_id=tmdb_id, value=value)
        db.session.add(like)
    
    db.session.commit()
    return jsonify({'status': 'success'})


@app.route('/api/unlike', methods=['POST'])
@login_required
def api_unlike():
    data = request.json
    tmdb_id = data.get('tmdb_id')
    
    if not tmdb_id:
        return jsonify({'status': 'error', 'message': 'ID фильма не указан'}), 400
    
    like = Like.query.filter_by(user_id=current_user.id, tmdb_id=tmdb_id).first()
    
    if like:
        db.session.delete(like)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Оценка удалена'})
    else:
        return jsonify({'status': 'error', 'message': 'Оценка не найдена'}), 404


@app.route('/api/user-likes')
@login_required
def api_user_likes():
    likes = Like.query.filter_by(user_id=current_user.id).all()
    return jsonify({
        'likes': [
            {'tmdb_id': like.tmdb_id, 'value': like.value}
            for like in likes
        ]
    })


@app.route('/api/user-settings', methods=['GET'])
@login_required
def api_get_user_settings():
    settings = UserSettings.query.filter_by(user_id=current_user.id).first()
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.session.add(settings)
        db.session.commit()
    
    return jsonify({
        'recommendation_algorithm': settings.recommendation_algorithm,
        'content_weight': settings.content_weight,
        'collaborative_weight': settings.collaborative_weight
    })


@app.route('/api/user-settings', methods=['POST'])
@login_required
def api_update_user_settings():
    data = request.json
    
    settings = UserSettings.query.filter_by(user_id=current_user.id).first()
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.session.add(settings)
    
    if 'recommendation_algorithm' in data:
        settings.recommendation_algorithm = data['recommendation_algorithm']
    if 'content_weight' in data:
        settings.content_weight = data['content_weight']
    if 'collaborative_weight' in data:
        settings.collaborative_weight = data['collaborative_weight']
    
    settings.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({'status': 'success', 'message': 'Настройки сохранены'})


@app.route('/api/smart-recommendations')
@login_required
def api_smart_recommendations():
    try:
        settings = UserSettings.query.filter_by(user_id=current_user.id).first()
        if not settings:
            settings = UserSettings(user_id=current_user.id)
            db.session.add(settings)
            db.session.commit()
        
        algorithm = settings.recommendation_algorithm
        user_id = current_user.id
        
        liked_movies = Like.query.filter_by(user_id=user_id, value=1).all()
        
        recommendations = pd.DataFrame()
        
        if algorithm == 'content' and liked_movies:
            all_content_recs = pd.DataFrame()
            for like in liked_movies[:3]:
                movie_info = movies_df[movies_df['tmdb_id'] == like.tmdb_id]
                if not movie_info.empty:
                    movie_title = movie_info.iloc[0]['title']
                    content_recs = get_content_recommendations(movie_title, top_n=10)
                    if not content_recs.empty:
                        all_content_recs = pd.concat([all_content_recs, content_recs], ignore_index=True)
            
            if not all_content_recs.empty:
                recommendations = all_content_recs.drop_duplicates(subset=['tmdb_id']).head(20)
        
        elif algorithm == 'collaborative':
            recommendations = get_collaborative_recommendations(user_id, top_n=20)
        
        elif algorithm == 'hybrid' and liked_movies:
            all_hybrid_recs = pd.DataFrame()
            for like in liked_movies[:2]:
                movie_info = movies_df[movies_df['tmdb_id'] == like.tmdb_id]
                if not movie_info.empty:
                    movie_title = movie_info.iloc[0]['title']
                    hybrid_recs = get_hybrid_recommendations(
                        user_id, 
                        movie_title, 
                        top_n=15,
                        cb_weight=settings.content_weight,
                        cf_weight=settings.collaborative_weight
                    )
                    if not hybrid_recs.empty:
                        all_hybrid_recs = pd.concat([all_hybrid_recs, hybrid_recs], ignore_index=True)
            
            if not all_hybrid_recs.empty:
                recommendations = all_hybrid_recs.drop_duplicates(subset=['tmdb_id']).head(20)
        
        if recommendations.empty or algorithm == 'popular':
            recommendations = popular_movies_df.head(20).copy()
        
        user_rated_movies = [like.tmdb_id for like in Like.query.filter_by(user_id=user_id).all()]
        recommendations = recommendations[~recommendations['tmdb_id'].isin(user_rated_movies)]
        
        recommendations['poster_url'] = recommendations.apply(get_poster_url, axis=1)
        
        for col in recommendations.columns:
            if recommendations[col].dtype == 'datetime64[ns]':
                recommendations[col] = recommendations[col].astype(str)
        
        movies_list = recommendations.head(20).to_dict('records')
        
        return jsonify({
            'movies': movies_list,
            'algorithm_used': algorithm,
            'total_count': len(movies_list)
        })
        
    except Exception as e:
        print(f"Error in smart recommendations: {str(e)}")
        import traceback
        traceback.print_exc()
        
        try:
            fallback_movies = popular_movies_df.head(20).copy()
            fallback_movies['poster_url'] = fallback_movies.apply(get_poster_url, axis=1)
            
            for col in fallback_movies.columns:
                if fallback_movies[col].dtype == 'datetime64[ns]':
                    fallback_movies[col] = fallback_movies[col].astype(str)
            
            movies_list = fallback_movies.to_dict('records')
            
            return jsonify({
                'movies': movies_list,
                'algorithm_used': 'popular',
                'total_count': len(movies_list),
                'error': 'Использованы популярные фильмы из-за ошибки в алгоритме'
            })
        except Exception as fallback_error:
            print(f"Fallback error: {str(fallback_error)}")
            return jsonify({'error': 'Ошибка получения рекомендаций'}), 500


@app.route('/api/popular')
def api_popular():
    try:
        popular_movies_df_copy = popular_movies_df.copy()
        
        available_columns = popular_movies_df_copy.columns.tolist()
        print(f"Available columns in popular_movies_df: {available_columns}")
        
        popular_movies_df_copy['poster_url'] = popular_movies_df_copy.apply(get_poster_url, axis=1)

        if 'release_date' in popular_movies_df_copy.columns:
            popular_movies_df_copy['release_date'] = popular_movies_df_copy['release_date'].astype(str).replace('NaT', None)

        required_columns = ['title', 'poster_url', 'overview', 'genres', 'release_date', 'vote_average', 'vote_count', 'tmdb_id']
        available_required_columns = [col for col in required_columns if col in popular_movies_df_copy.columns]
        
        for col in required_columns:
            if col not in popular_movies_df_copy.columns:
                if col == 'overview':
                    popular_movies_df_copy[col] = ''
                elif col == 'genres':
                    popular_movies_df_copy[col] = 'Unknown'
                elif col == 'vote_average':
                    popular_movies_df_copy[col] = 0.0
                elif col == 'vote_count':
                    popular_movies_df_copy[col] = 0
                else:
                    popular_movies_df_copy[col] = None

        movies_list = popular_movies_df_copy[required_columns].to_dict('records')
        
        return jsonify(movies_list)
        
    except Exception as e:
        print(f"Error in api_popular: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/new')
def api_new():
    try:
        movies_df_copy = movies_df.copy()
        movies_df_copy['release_date_dt'] = pd.to_datetime(movies_df_copy['release_date'], errors='coerce')
        
        new_movies_df = movies_df_copy.dropna(subset=['release_date_dt']).sort_values(by='release_date_dt', ascending=False).head(20)
        
        new_movies_df = new_movies_df.copy()
        new_movies_df['poster_url'] = new_movies_df.apply(get_poster_url, axis=1)

        if 'release_date' in new_movies_df.columns:
            new_movies_df['release_date'] = new_movies_df['release_date'].astype(str).replace('NaT', None)

        required_columns = ['title', 'poster_url', 'overview', 'genres', 'release_date', 'vote_average', 'vote_count', 'tmdb_id']
        
        for col in required_columns:
            if col not in new_movies_df.columns:
                if col == 'overview':
                    new_movies_df[col] = ''
                elif col == 'genres':
                    new_movies_df[col] = 'Unknown'
                elif col == 'vote_average':
                    new_movies_df[col] = 0.0
                elif col == 'vote_count':
                    new_movies_df[col] = 0
                else:
                    new_movies_df[col] = None

        movies_list = new_movies_df[required_columns].to_dict('records')

        return jsonify(movies_list)
        
    except Exception as e:
        print(f"Error in api_new: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/static/<path:filename>')
def serve_static(filename):
    static_dir = os.path.join(app.root_path, 'static')
    return send_from_directory(static_dir, filename)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

def get_poster_url(movie_dict: dict) -> str:
    if 'local_poster' in movie_dict and pd.notna(movie_dict['local_poster']):
        return f"/static/{movie_dict['local_poster']}"

    if 'poster_path' in movie_dict and pd.notna(movie_dict['poster_path']):
        if movie_dict['poster_path'].startswith('http'):
            return movie_dict['poster_path']
        return f"https://image.tmdb.org/t/p/w500{movie_dict['poster_path']}"

    genre = "Default"
    if 'genres' in movie_dict and movie_dict['genres']:
        first_genre = movie_dict['genres'][0] if isinstance(movie_dict['genres'], list) else str(movie_dict['genres']).split(',')[0]
        genre = GENRE_EMOJIS.get(first_genre.strip(), "🎬")

    emoji = GENRE_EMOJIS.get(genre, "🎬")
    return f"https://emoji.beeimg.com/{emoji}"


def fetch_imdb_poster(imdb_id: str) -> Optional[str]:
    if not imdb_id or pd.isna(imdb_id) or not re.match(r"tt\d+", imdb_id):
        return None
    api_key = os.environ.get("OMDB_API_KEY", "YOUR_OMDB_KEY")
    if api_key == "YOUR_OMDB_KEY":
        return None
    
    url = f"http://www.omdbapi.com/?i={imdb_id}&apikey={api_key}"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        if data.get("Response") == "True" and "Poster" in data and data["Poster"] != "N/A":
            return data["Poster"]
    except requests.RequestException as e:
        print(f"[ERROR] Failed to fetch poster for {imdb_id}: {e}")
    return None


def get_imdb_poster_cached(imdb_id: str) -> Optional[str]:
    return fetch_imdb_poster(imdb_id)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 