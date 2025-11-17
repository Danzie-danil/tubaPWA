import os
from typing import List


class Settings:
    ENV: str
    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    CORS_ORIGINS: List[str]

    def __init__(self) -> None:
        self.ENV = os.getenv("ENV", "dev")
        self.DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
        if os.getenv("VERCEL") and self.DATABASE_URL.startswith("sqlite"):
            self.DATABASE_URL = "sqlite:////tmp/app.db"
        self.SECRET_KEY = os.getenv("SECRET_KEY", "TODO_CHANGE_ME")
        self.ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
        cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5500,http://localhost:3000")
        self.CORS_ORIGINS = [o.strip() for o in cors_origins.split(",") if o.strip()]


settings = Settings()
