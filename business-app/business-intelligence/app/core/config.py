from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_env: str = "development"
    port: int = 8000

    # Neon PostgreSQL connection URL — required in all environments.
    # Never log, print, or hardcode this value.
    # Read from BI_DATABASE_URL environment variable.
    bi_database_url: str = ""

    # Internal service token for Business App → BI communication.
    bi_internal_service_token: str = ""

    # MongoDB URI for ETL extraction from the Business App operational database.
    # Only required when ETL pipelines are enabled.
    # Read from MONGO_URI environment variable.
    mongo_uri: str = ""

    # MongoDB database name — defaults to the Business App's operational db.
    mongo_database: str = "business_app_db"

    model_config = {"env_file": ".env", "extra": "ignore"}

    def require_database_url(self) -> str:
        """Returns bi_database_url or raises if not configured."""
        if not self.bi_database_url:
            raise RuntimeError(
                "BI_DATABASE_URL is required. "
                "Set it in the .env file or as an environment variable. "
                "See .env.example for the format."
            )
        return self.bi_database_url


settings = Settings()
