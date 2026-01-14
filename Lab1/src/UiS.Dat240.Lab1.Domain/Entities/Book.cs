namespace UiS.Dat240.Lab1.Domain.Entities;

public class Book
{
    public string ISBN { get; private set; }
    public string Title { get; private set; }
    public string Author { get; private set; }
    public BookStatus Status { get; private set; }
    public string? ReservedForMemberId { get; private set; }

    /// <summary>
    /// Creates a new book.
    /// </summary>
    /// <param name="isbn">The ISBN of the book (must not be null or empty)</param>
    /// <param name="title">The title of the book (must not be null or empty)</param>
    /// <param name="author">The author of the book (must not be null or empty)</param>
    /// <exception cref="ArgumentException">Thrown when any parameter is null or empty</exception>
    public Book(string isbn, string title, string author)
    {
        // TODO: Validate parameters and initialize properties
        // Initial status should be Available
        throw new NotImplementedException();
    }

    /// <summary>
    /// Marks the book as borrowed by a member.
    /// </summary>
    /// <param name="memberId">The ID of the member borrowing the book</param>
    /// <exception cref="InvalidOperationException">Thrown when the book is not available for borrowing</exception>
    public void Borrow(string memberId)
    {
        // TODO: Implement borrowing logic
        // Can only borrow if status is Available
        // Change status to Borrowed
        throw new NotImplementedException();
    }

    /// <summary>
    /// Returns the book to the library.
    /// If the book is reserved, it becomes Reserved; otherwise it becomes Available.
    /// </summary>
    public void Return()
    {
        // TODO: Implement return logic
        // If ReservedForMemberId is set, status becomes Reserved
        // Otherwise, status becomes Available and ReservedForMemberId is cleared
        throw new NotImplementedException();
    }

    /// <summary>
    /// Reserves the book for a member.
    /// </summary>
    /// <param name="memberId">The ID of the member reserving the book</param>
    /// <exception cref="InvalidOperationException">Thrown when the book cannot be reserved</exception>
    public void Reserve(string memberId)
    {
        // TODO: Implement reservation logic
        // Can only reserve if status is Borrowed (not Available or already Reserved)
        // Set ReservedForMemberId and change status to Reserved
        throw new NotImplementedException();
    }

    /// <summary>
    /// Cancels the current reservation.
    /// </summary>
    public void CancelReservation()
    {
        // TODO: Implement cancellation logic
        // Clear ReservedForMemberId
        // If status is Reserved, change to Available
        throw new NotImplementedException();
    }

    /// <summary>
    /// Checks if the book is available for borrowing.
    /// </summary>
    /// <returns>True if the book can be borrowed, false otherwise</returns>
    public bool IsAvailableForBorrowing()
    {
        // TODO: Implement
        // Only Available books can be borrowed
        throw new NotImplementedException();
    }

    /// <summary>
    /// Checks if the book can be reserved.
    /// </summary>
    /// <returns>True if the book can be reserved, false otherwise</returns>
    public bool CanBeReserved()
    {
        // TODO: Implement
        // Can only reserve Borrowed books (not Available or already Reserved)
        throw new NotImplementedException();
    }
}

public enum BookStatus
{
    Available,
    Borrowed,
    Reserved
}
