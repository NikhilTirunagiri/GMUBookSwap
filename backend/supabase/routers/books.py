"""
Books API Router
Handles CRUD operations for book listings with authentication and authorization.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, field_validator, Field
from typing import Optional
from utils.supabase import supabase
from deps.auth import get_current_user, get_optional_user

router = APIRouter()


class BookCreate(BaseModel):
    """Schema for creating a new book listing"""
    title: str = Field(..., min_length=1, max_length=500)
    author: Optional[str] = Field(None, max_length=300)
    isbn: Optional[str] = Field(None, max_length=20)
    genre: Optional[str] = Field(None, max_length=100)
    material_type: Optional[str] = Field(None, pattern="^(book|journal|article)$")
    trade_type: Optional[str] = Field(None, pattern="^(buy|trade|borrow)$")
    price: float = Field(..., ge=0)  # Must be >= 0
    condition: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    image_url: Optional[str] = Field(None, max_length=2000)
    seller_name: str = Field(..., min_length=1, max_length=200)
    seller_email: str = Field(..., pattern=r"^[a-zA-Z0-9._%+-]+@gmu\.edu$")

    @field_validator('isbn')
    @classmethod
    def validate_isbn(cls, v):
        """Validate ISBN format if provided"""
        if v is not None and v.strip():
            # Remove hyphens and spaces
            isbn = v.replace('-', '').replace(' ', '').strip()
            # Check if it's 10 or 13 digits
            if not (isbn.isdigit() and len(isbn) in [10, 13]):
                raise ValueError('ISBN must be 10 or 13 digits')
            return isbn
        return v

    @field_validator('image_url')
    @classmethod
    def validate_image_url(cls, v):
        """Prevent base64 images in image_url field"""
        if v and v.startswith('data:image'):
            raise ValueError('Base64 images not allowed. Please use Supabase Storage.')
        return v


@router.get("/")
def get_books(current_user: dict = Depends(get_optional_user)):
    """
    Get all available books from the database.
    Authentication optional.

    Returns:
        list: All book listings
    """
    try:
        # Query the books table from Supabase
        # Order by creation date, newest first
        response = supabase.table("books").select("*").order("created_at", desc=True).execute()

        if not response.data:
            return []

        return response.data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching books: {str(e)}")


@router.get("/{book_id}")
def get_book_by_id(book_id: str, current_user: dict = Depends(get_optional_user)):
    """
    Get a specific book by its ID.
    Authentication optional.

    Args:
        book_id: The book ID to fetch

    Returns:
        dict: Book details

    Raises:
        HTTPException: 404 if book not found
    """
    try:
        response = supabase.table("books").select("*").eq("id", book_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Book not found")

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching book: {str(e)}")


@router.post("/")
def create_book(book: BookCreate, current_user: dict = Depends(get_current_user)):
    """
    Create a new book listing.
    REQUIRES AUTHENTICATION.

    Args:
        book: Book details
        current_user: Authenticated user from JWT

    Returns:
        dict: Created book listing

    Raises:
        HTTPException: 401 if not authenticated, 400 if validation fails
    """
    try:
        # SECURITY: Verify that seller_email matches authenticated user
        if book.seller_email != current_user["email"]:
            raise HTTPException(
                status_code=403,
                detail="You can only create listings with your own email address"
            )

        # Verify GMU email
        if not book.seller_email.endswith("@gmu.edu"):
            raise HTTPException(
                status_code=400,
                detail="Only GMU email addresses are allowed"
            )

        # Insert into database
        response = supabase.table("books").insert(book.model_dump()).execute()

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create book")

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating book: {str(e)}")


@router.delete("/{book_id}")
def delete_book(book_id: str, current_user: dict = Depends(get_current_user)):
    """
    Delete a book listing by ID.
    REQUIRES AUTHENTICATION.
    Users can only delete their own listings.

    Args:
        book_id: The book ID to delete
        current_user: Authenticated user from JWT

    Returns:
        dict: Success message

    Raises:
        HTTPException: 401 if not authenticated, 403 if not owner, 404 if not found
    """
    try:
        # First check if book exists and get owner
        check_response = supabase.table("books").select("*").eq("id", book_id).execute()

        if not check_response.data:
            raise HTTPException(status_code=404, detail="Book not found")

        book = check_response.data[0]

        # CRITICAL SECURITY: Verify ownership before allowing deletion
        if book["seller_email"] != current_user["email"]:
            raise HTTPException(
                status_code=403,
                detail="You can only delete your own listings"
            )

        # Delete the book
        supabase.table("books").delete().eq("id", book_id).execute()

        return {"message": "Book deleted successfully", "id": book_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting book: {str(e)}")


@router.put("/{book_id}")
def update_book(book_id: str, book: BookCreate, current_user: dict = Depends(get_current_user)):
    """
    Update a book listing.
    REQUIRES AUTHENTICATION.
    Users can only update their own listings.

    Args:
        book_id: The book ID to update
        book: Updated book details
        current_user: Authenticated user from JWT

    Returns:
        dict: Updated book listing

    Raises:
        HTTPException: 401 if not authenticated, 403 if not owner, 404 if not found
    """
    try:
        # Check if book exists and get owner
        check_response = supabase.table("books").select("*").eq("id", book_id).execute()

        if not check_response.data:
            raise HTTPException(status_code=404, detail="Book not found")

        existing_book = check_response.data[0]

        # CRITICAL SECURITY: Verify ownership
        if existing_book["seller_email"] != current_user["email"]:
            raise HTTPException(
                status_code=403,
                detail="You can only update your own listings"
            )

        # Verify that seller_email hasn't changed
        if book.seller_email != current_user["email"]:
            raise HTTPException(
                status_code=403,
                detail="You cannot change the seller email"
            )

        # Update the book
        response = supabase.table("books").update(book.model_dump()).eq("id", book_id).execute()

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to update book")

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating book: {str(e)}")
