from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from ..database import get_db
from ..models.transaction import Transaction, TransactionItem
from ..models.product import Product
from ..schemas.transaction import TransactionCreate, TransactionRead
from ..utils.jwt_handler import get_current_user
from ..models.user import User


router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=List[TransactionRead])
def list_transactions(skip: int = 0, limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    records = (
        db.query(Transaction)
        .order_by(Transaction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return records


@router.get("/{transaction_id}", response_model=TransactionRead)
def get_transaction(transaction_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


@router.post("", response_model=TransactionRead)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = 0.0
    items_models: List[TransactionItem] = []
    for item in payload.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Invalid product {item.product_id}")
        if (product.quantity or 0) < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}")
        unit_price = float(product.price)
        subtotal = unit_price * item.quantity
        total += subtotal
        product.quantity = (product.quantity or 0) - item.quantity
        db.add(product)
        items_models.append(
            TransactionItem(product_id=product.id, quantity=item.quantity, unit_price=unit_price, subtotal=subtotal)
        )
    tx = Transaction(user_id=current_user.id, total_amount=total)
    db.add(tx)
    db.commit()
    db.refresh(tx)
    for im in items_models:
        im.transaction_id = tx.id
        db.add(im)
    db.commit()
    db.refresh(tx)
    return tx


@router.get("/analytics/summary")
def analytics_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_sales = db.query(func.sum(Transaction.total_amount)).scalar() or 0.0
    total_transactions = db.query(func.count(Transaction.id)).scalar() or 0
    top_products = (
        db.query(Product.name, func.sum(TransactionItem.quantity).label("qty"))
        .join(TransactionItem, TransactionItem.product_id == Product.id)
        .group_by(Product.id)
        .order_by(func.sum(TransactionItem.quantity).desc())
        .limit(5)
        .all()
    )
    return {
        "total_sales": total_sales,
        "total_transactions": total_transactions,
        "top_products": [{"name": name, "quantity": int(qty or 0)} for name, qty in top_products],
    }

