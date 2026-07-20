from sqlalchemy import Column, Integer, String, Boolean, Date
from app.database.postgres import Base


class DimTime(Base):
    __tablename__ = "dim_time"

    date_key              = Column(Date, primary_key=True)
    year                  = Column(Integer, nullable=False)
    quarter               = Column(Integer, nullable=False)
    fiscal_year           = Column(Integer)
    fiscal_quarter        = Column(Integer)
    month                 = Column(Integer, nullable=False)
    month_name            = Column(String(20))
    week_of_year          = Column(Integer)
    day_of_week           = Column(Integer)    # 1=Mon..7=Sun
    is_weekend            = Column(Boolean, nullable=False)
    is_au_public_holiday  = Column(Boolean, default=False)
