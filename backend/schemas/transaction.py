from pydantic import BaseModel
from typing import List
from datetime import datetime


class TransactionItemCreate(BaseModel):
    product_id: int
    quantity: int


class TransactionCreate(BaseModel):
    items: List[TransactionItemCreate]


class TransactionItemRead(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    subtotal: float

    class Config:
        orm_mode = True


class TransactionRead(BaseModel):
    id: int
    total_amount: float
    created_at: datetime
    items: List[TransactionItemRead]

    class Config:
        orm_mode = True

