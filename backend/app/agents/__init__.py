"""Per-intent agent configs (system prompt + JSON schema + search hints)."""
from . import (
    shopping, price_history, trip, insta, general,
    movies, recipes, books, places, events,
    tech, health, finance, news, sports,
    howto, learning, jobs, local, comparison,
    gift, legal, gaming, diy, fitness,
    pets, music, productivity, weather, real_estate,
    automotive, food, fashion, parenting, dating,
)

__all__ = [
    "shopping", "price_history", "trip", "insta", "general",
    "movies", "recipes", "books", "places", "events",
    "tech", "health", "finance", "news", "sports",
    "howto", "learning", "jobs", "local", "comparison",
    "gift", "legal", "gaming", "diy", "fitness",
    "pets", "music", "productivity", "weather", "real_estate",
    "automotive", "food", "fashion", "parenting", "dating",
]
