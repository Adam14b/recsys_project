#!/usr/bin/env python
"""fetch_imdb_posters.py

Скрипт скачивает постеры фильмов с сайта IMDb для датасета
"The Movies Dataset" (https://www.kaggle.com/rounakbanik/the-movies-dataset).

1. Ожидает, что набор данных распакован в директорию ``the_movies_dataset``
   в корне проекта (рядом с ``app.py``), где присутствует файл ``links.csv``.
   Если файлы лежат в другом месте, задайте путь через аргумент ``--data-dir``.
2. Читает колонку ``imdbId`` из ``links.csv``.
3. Для каждого IMDb ID запрашивает страницу ``https://www.imdb.com/title/tt<id>/``
   и вытаскивает URL постера из тега ``<meta property="og:image">``.
4. Скачивает изображение в ``static/posters/tt<id>.jpg``.
5. Добавляет колонку ``local_poster`` (относительный путь к картинке),
   сохраняет расширенную таблицу в ``links_with_posters.parquet``.

Запуск:
    python scripts/fetch_imdb_posters.py            # пути по умолчанию
    python scripts/fetch_imdb_posters.py --limit 500  # для теста на 500 фильмах

Примечания:
- IMDb может ограничить частые запросы. В скрипте есть пауза 0.5 сек между
  скачиваниями, но этого может быть мало на медленных сетях. При необходимости
  увеличьте параметр ``--sleep``.
- Постеры используются только в учебных/личных целях. Для публичных проектов
  убедитесь в соответствии с лицензией IMDb.
"""
from __future__ import annotations

import argparse
import re
import time
from pathlib import Path
from typing import Optional

import pandas as pd
import requests
from bs4 import BeautifulSoup
from tqdm import tqdm

# ---------------------------------------------------------------------------
# Константы и регулярные выражения
# ---------------------------------------------------------------------------
IMDB_POSTER_RE = re.compile(r"^https://m\.media-amazon\.com/images/.*\.jpg")
HEADERS = {
    "Accept-Language": "en-US,en;q=0.5",
    "User-Agent": "Mozilla/5.0 (compatible; PosterFetcher/1.0)"
}

# ---------------------------------------------------------------------------
# Функции
# ---------------------------------------------------------------------------

def fetch_poster_url(imdb_id: str, session: requests.Session) -> Optional[str]:
    """Возвращает URL постера для фильма на IMDb или None."""
    url = f"https://www.imdb.com/title/tt{imdb_id}/"
    try:
        resp = session.get(url, headers=HEADERS, timeout=10)
        resp.raise_for_status()
    except requests.RequestException:
        return None

    soup = BeautifulSoup(resp.text, "html.parser")
    meta = soup.find("meta", property="og:image")
    if meta and meta.get("content") and IMDB_POSTER_RE.match(meta["content" ]):
        return meta["content"]
    return None


def download_file(url: str, dest_path: Path, session: requests.Session) -> bool:
    """Скачивает файл и сохраняет в dest_path. Возвращает True при успехе."""
    try:
        r = session.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
    except requests.RequestException:
        return False

    content_type = r.headers.get("Content-Type", "")
    if not content_type.startswith("image"):
        return False
    dest_path.write_bytes(r.content)
    return True


# ---------------------------------------------------------------------------
# Основной скрипт
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Fetch IMDb posters for The Movies Dataset")
    parser.add_argument("--data-dir", type=Path, default=Path("the_movies_dataset"),
                        help="Каталог, где лежит links.csv")
    parser.add_argument("--out-dir", type=Path, default=Path("static/posters"),
                        help="Куда сохранять постеры")
    parser.add_argument("--sleep", type=float, default=0.5,
                        help="Пауза между запросами, сек")
    parser.add_argument("--limit", type=int, default=None,
                        help="Ограничить количество фильмов (для отладки)")
    args = parser.parse_args()

    links_csv = args.data_dir / r"C:\Users\adam4\.cache\kagglehub\datasets\rounakbanik\the-movies-dataset\versions\7\links.csv"
    if not links_csv.exists():
        raise FileNotFoundError(f"Файл {links_csv} не найден. Укажите --data-dir.")

    # Читаем таблицу ссылок
    links_df = pd.read_csv(links_csv)
    links_df["imdbId"] = links_df["imdbId"].astype(str).str.zfill(7)

    # Добавляем колонку, если её нет
    if "local_poster" not in links_df.columns:
        links_df["local_poster"] = pd.NA

    # Создаём выходную директорию
    args.out_dir.mkdir(parents=True, exist_ok=True)

    # Определяем, какие фильмы ещё без постера
    todo_idx = links_df[links_df["local_poster"].isna()].index
    if args.limit:
        todo_idx = todo_idx[: args.limit]

    session = requests.Session()

    print(f"Нужно скачать постеры для {len(todo_idx)} фильмов")
    for idx in tqdm(todo_idx, unit="film"):
        imdb_id = links_df.at[idx, "imdbId"]

        poster_url = fetch_poster_url(imdb_id, session=session)
        if not poster_url:
            continue

        local_filename = f"tt{imdb_id}.jpg"
        dest_path = args.out_dir / local_filename

        if dest_path.exists():
            links_df.at[idx, "local_poster"] = dest_path.relative_to(dest_path.parents[1]).as_posix()
            continue

        if download_file(poster_url, dest_path, session=session):
            # Относительный путь (например, posters/tt1234567.jpg)
            links_df.at[idx, "local_poster"] = dest_path.relative_to(dest_path.parents[1]).as_posix()
            time.sleep(args.sleep)

    # Сохраняем расширенную таблицу
    out_path = args.data_dir / "links_with_posters.parquet"
    links_df.to_parquet(out_path, index=False)
    print("Готово! Таблица с локальными путями сохранена:", out_path)


if __name__ == "__main__":
    main() 