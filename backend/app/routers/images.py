from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.image import JournalImage, OrderImage
from app.models.journal import Journal
from app.models.order import OrderItem
from app.models.user import User
from app.schemas.image import ImageRead

router = APIRouter(tags=["images"])


@router.post(
    "/api/journals/{journal_id}/images", response_model=ImageRead, status_code=status.HTTP_201_CREATED
)
async def upload_journal_image(
    journal_id: int,
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    journal = db.query(Journal).filter(Journal.id == journal_id, Journal.user_id == current_user.id).first()
    if journal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal not found")

    data = await file.read()
    image = JournalImage(
        journal_id=journal_id,
        filename=file.filename or "upload",
        content_type=file.content_type or "application/octet-stream",
        data=data,
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


@router.post("/api/orders/{order_id}/images", response_model=ImageRead, status_code=status.HTTP_201_CREATED)
async def upload_order_image(
    order_id: int,
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = (
        db.query(OrderItem)
        .join(Journal)
        .filter(OrderItem.id == order_id, Journal.user_id == current_user.id)
        .first()
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    data = await file.read()
    image = OrderImage(
        order_id=order_id,
        filename=file.filename or "upload",
        content_type=file.content_type or "application/octet-stream",
        data=data,
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


@router.get("/api/journal-images/{image_id}/raw")
def get_journal_image_raw(image_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    image = (
        db.query(JournalImage)
        .join(Journal)
        .filter(JournalImage.id == image_id, Journal.user_id == current_user.id)
        .first()
    )
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    return Response(content=image.data, media_type=image.content_type)


@router.get("/api/order-images/{image_id}/raw")
def get_order_image_raw(image_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    image = (
        db.query(OrderImage)
        .join(OrderItem)
        .join(Journal)
        .filter(OrderImage.id == image_id, Journal.user_id == current_user.id)
        .first()
    )
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    return Response(content=image.data, media_type=image.content_type)


@router.delete("/api/journal-images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_journal_image(image_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    image = (
        db.query(JournalImage)
        .join(Journal)
        .filter(JournalImage.id == image_id, Journal.user_id == current_user.id)
        .first()
    )
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    db.delete(image)
    db.commit()


@router.delete("/api/order-images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order_image(image_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    image = (
        db.query(OrderImage)
        .join(OrderItem)
        .join(Journal)
        .filter(OrderImage.id == image_id, Journal.user_id == current_user.id)
        .first()
    )
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    db.delete(image)
    db.commit()
