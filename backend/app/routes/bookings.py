from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from app.models.booking import Booking, Review, BookingStatus
from app.models.tutor import TutorProfile
from app.models.user import User
from app.schemas.booking import BookingCreate, BookingUpdate, BookingResponse, ReviewCreate, ReviewResponse
from app.routes.auth import get_current_user
from app.services.google_meet import google_meet_service
from app.services.notification_service import notification_service
from app.services.payment_service import payment_service
from datetime import datetime

router = APIRouter()


def create_booking_response(b: Booking) -> BookingResponse:
    """Helper to create BookingResponse from Booking model"""
    return BookingResponse(
        id=str(b.id),
        student_id=b.student_id,
        tutor_id=b.tutor_id,
        student_name=b.student_name,
        tutor_name=b.tutor_name,
        student_email=b.student_email,
        tutor_email=b.tutor_email,
        subject=b.subject,
        session_type=b.session_type,
        scheduled_at=b.scheduled_at,
        duration_minutes=b.duration_minutes,
        price=b.price,
        currency=b.currency,
        status=b.status,
        notes=b.notes,
        meeting_link=b.meeting_link,
        google_event_id=b.google_event_id,
        created_at=b.created_at
    )


@router.post("", response_model=BookingResponse)
async def create_booking(
    booking_data: BookingCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new booking request"""
    tutor = await TutorProfile.get(booking_data.tutor_id)
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")

    session_price = tutor.hourly_rate * (booking_data.duration_minutes / 60)

    booking = Booking(
        student_id=str(current_user.id),
        tutor_id=booking_data.tutor_id,
        subject=booking_data.subject,
        session_type=booking_data.session_type,
        scheduled_at=booking_data.scheduled_at,
        duration_minutes=booking_data.duration_minutes,
        price=session_price,
        currency=tutor.currency,
        notes=booking_data.notes,
        student_name=current_user.full_name,
        tutor_name=tutor.full_name,
        student_email=current_user.email,
        tutor_email=tutor.email
    )
    await booking.insert()

    # Create payment record with fee calculation
    try:
        payment = await payment_service.create_payment(
            booking_id=str(booking.id),
            student_id=str(current_user.id),
            tutor_id=booking_data.tutor_id,
            session_amount=session_price,
            currency=tutor.currency
        )
        print(f"[Payment] Created payment {payment.id} - Commission: ${payment.commission_fee}, Admission: ${payment.admission_fee}")
    except Exception as e:
        print(f"[Payment] Failed to create payment record: {e}")

    # Send notification to tutor
    try:
        await notification_service.notify_new_booking(
            tutor_user_id=tutor.user_id,
            student_name=current_user.full_name,
            student_id=str(current_user.id),
            subject=booking.subject,
            booking_id=str(booking.id),
            scheduled_at=booking.scheduled_at
        )
    except Exception as e:
        print(f"Failed to send booking notification: {e}")

    return create_booking_response(booking)


@router.get("", response_model=List[BookingResponse])
async def get_my_bookings(current_user: User = Depends(get_current_user)):
    """Get all bookings for the current user (as student or tutor)"""
    bookings = await Booking.find(
        {"$or": [
            {"student_id": str(current_user.id)},
            {"tutor_id": str(current_user.id)}
        ]}
    ).sort("-created_at").to_list()

    return [create_booking_response(b) for b in bookings]


@router.put("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: str,
    booking_data: BookingUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a booking"""
    booking = await Booking.get(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.student_id != str(current_user.id) and booking.tutor_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = booking_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(booking, field, value)
    booking.updated_at = datetime.utcnow()

    await booking.save()

    return create_booking_response(booking)


@router.post("/{booking_id}/confirm", response_model=BookingResponse)
async def confirm_booking(
    booking_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Confirm a booking and generate Google Meet link.
    Only the tutor can confirm a booking.
    """
    booking = await Booking.get(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Check if user is the tutor
    tutor = await TutorProfile.find_one(TutorProfile.user_id == str(current_user.id))
    if not tutor or str(tutor.id) != booking.tutor_id:
        raise HTTPException(status_code=403, detail="Only the tutor can confirm this booking")

    if booking.status == BookingStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail="Booking is already confirmed")

    # Create Google Meet event
    session_type_str = "1-on-1" if booking.session_type.value == "private" else "Group"
    meet_result = google_meet_service.create_meet_event(
        title=f"{booking.subject} Tutoring Session - {session_type_str}",
        description=f"Tutoring session with {booking.tutor_name}\nStudent: {booking.student_name}\nSubject: {booking.subject}\n\nNotes: {booking.notes or 'None'}",
        start_time=booking.scheduled_at,
        duration_minutes=booking.duration_minutes,
        tutor_email=booking.tutor_email,
        student_email=booking.student_email
    )

    # Update booking with Meet link
    booking.status = BookingStatus.CONFIRMED
    if meet_result:
        booking.meeting_link = meet_result.get('meet_link')
        booking.google_event_id = meet_result.get('event_id')
    booking.updated_at = datetime.utcnow()

    await booking.save()

    # Complete the payment when booking is confirmed
    try:
        payment = await payment_service.get_payment_by_booking(booking_id)
        if payment:
            await payment_service.complete_payment(str(payment.id))
            print(f"[Payment] Completed payment {payment.id} for booking {booking_id}")
    except Exception as e:
        print(f"[Payment] Failed to complete payment: {e}")

    # Send notification to student
    try:
        await notification_service.notify_booking_confirmed(
            student_user_id=booking.student_id,
            tutor_name=booking.tutor_name or current_user.full_name,
            tutor_id=str(current_user.id),
            subject=booking.subject,
            booking_id=str(booking.id),
            scheduled_at=booking.scheduled_at,
            meeting_link=booking.meeting_link
        )
    except Exception as e:
        print(f"Failed to send confirmation notification: {e}")

    return create_booking_response(booking)


class MeetLinkUpdate(BaseModel):
    meeting_link: str


@router.put("/{booking_id}/meet-link", response_model=BookingResponse)
async def update_meet_link(
    booking_id: str,
    data: MeetLinkUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Manually update the Meet link for a booking.
    Only the tutor can update the Meet link.
    """
    booking = await Booking.get(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Check if user is the tutor
    tutor = await TutorProfile.find_one(TutorProfile.user_id == str(current_user.id))
    if not tutor or str(tutor.id) != booking.tutor_id:
        raise HTTPException(status_code=403, detail="Only the tutor can update the Meet link")

    booking.meeting_link = data.meeting_link
    booking.updated_at = datetime.utcnow()

    await booking.save()

    return create_booking_response(booking)


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: str,
    current_user: User = Depends(get_current_user)
):
    """Cancel a booking. Both student and tutor can cancel."""
    booking = await Booking.get(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Check authorization
    tutor = await TutorProfile.find_one(TutorProfile.user_id == str(current_user.id))
    tutor_id = str(tutor.id) if tutor else None
    is_cancelled_by_student = booking.student_id == str(current_user.id)

    if booking.student_id != str(current_user.id) and booking.tutor_id != tutor_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if booking.status == BookingStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    # Cancel Google Calendar event if exists
    if booking.google_event_id:
        google_meet_service.cancel_event(booking.google_event_id)

    booking.status = BookingStatus.CANCELLED
    booking.updated_at = datetime.utcnow()

    await booking.save()

    # Send notification to the other party
    try:
        if is_cancelled_by_student:
            # Notify tutor that student cancelled
            if tutor:
                await notification_service.notify_booking_cancelled(
                    user_id=tutor.user_id,
                    cancelled_by_name=current_user.full_name,
                    cancelled_by_id=str(current_user.id),
                    subject=booking.subject,
                    booking_id=str(booking.id),
                    scheduled_at=booking.scheduled_at,
                    is_student=False
                )
        else:
            # Notify student that tutor cancelled
            await notification_service.notify_booking_cancelled(
                user_id=booking.student_id,
                cancelled_by_name=current_user.full_name,
                cancelled_by_id=str(current_user.id),
                subject=booking.subject,
                booking_id=str(booking.id),
                scheduled_at=booking.scheduled_at,
                is_student=True
            )
    except Exception as e:
        print(f"Failed to send cancellation notification: {e}")

    return create_booking_response(booking)


@router.get("/tutor/my-bookings", response_model=List[BookingResponse])
async def get_tutor_bookings(current_user: User = Depends(get_current_user)):
    """Get all bookings for the current tutor"""
    tutor = await TutorProfile.find_one(TutorProfile.user_id == str(current_user.id))
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    bookings = await Booking.find(
        Booking.tutor_id == str(tutor.id)
    ).sort("-scheduled_at").to_list()

    return [create_booking_response(b) for b in bookings]


@router.post("/reviews", response_model=ReviewResponse)
async def create_review(
    review_data: ReviewCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a review for a tutor"""
    tutor = await TutorProfile.get(review_data.tutor_id)
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")

    review = Review(
        student_id=str(current_user.id),
        tutor_id=review_data.tutor_id,
        booking_id=review_data.booking_id,
        rating=review_data.rating,
        comment=review_data.comment,
        student_name=current_user.full_name,
        student_avatar=current_user.avatar
    )
    await review.insert()

    # Update tutor rating
    all_reviews = await Review.find(Review.tutor_id == review_data.tutor_id).to_list()
    total_rating = sum(r.rating for r in all_reviews)
    tutor.rating = total_rating / len(all_reviews)
    tutor.total_reviews = len(all_reviews)
    await tutor.save()

    # Send notification to tutor
    try:
        await notification_service.notify_review_received(
            tutor_user_id=tutor.user_id,
            student_name=current_user.full_name,
            student_id=str(current_user.id),
            rating=review_data.rating,
            booking_id=review_data.booking_id
        )
    except Exception as e:
        print(f"Failed to send review notification: {e}")

    return ReviewResponse(
        id=str(review.id),
        student_id=review.student_id,
        tutor_id=review.tutor_id,
        student_name=review.student_name,
        student_avatar=review.student_avatar,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at
    )
