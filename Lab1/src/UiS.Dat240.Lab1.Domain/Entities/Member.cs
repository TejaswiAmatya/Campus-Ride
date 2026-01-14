namespace UiS.Dat240.Lab1.Domain.Entities;

public class Member
{
    // Constants for business rules
    private const int MaxActiveLoans = 5;
    private const decimal MaxFinesBeforeSuspension = 10.00m;

    public string MemberId { get; private set; }
    public string Name { get; private set; }
    public string Email { get; private set; }
    public MemberStatus Status { get; private set; }
    public decimal OutstandingFines { get; private set; }

    private readonly List<Loan> _activeLoans = new();
    public IReadOnlyList<Loan> ActiveLoans => _activeLoans.AsReadOnly();

    /// <summary>
    /// Creates a new library member.
    /// </summary>
    /// <param name="memberId">Unique member identifier (must not be null or empty)</param>
    /// <param name="name">Member's name (must not be null or empty)</param>
    /// <param name="email">Member's email (must not be null or empty and must contain @)</param>
    /// <exception cref="ArgumentException">Thrown when parameters are invalid</exception>
    public Member(string memberId, string name, string email)
    {
        // TODO: Validate parameters
        // - memberId, name, email must not be null or whitespace
        // - email must contain '@' character
        // Initial status should be Active
        // Initial outstanding fines should be 0
        throw new NotImplementedException();
    }

    /// <summary>
    /// Checks if the member is allowed to borrow books.
    /// </summary>
    /// <returns>True if the member can borrow, false otherwise</returns>
    public bool CanBorrow()
    {
        // TODO: Implement
        // Member can borrow if:
        // - Status is Active
        // - Has fewer than MaxActiveLoans (5) active loans
        // - Outstanding fines are less than MaxFinesBeforeSuspension ($10)
        throw new NotImplementedException();
    }

    /// <summary>
    /// Borrows a book for this member.
    /// </summary>
    /// <param name="book">The book to borrow</param>
    /// <exception cref="InvalidOperationException">Thrown when member cannot borrow</exception>
    public void BorrowBook(Book book)
    {
        // TODO: Implement
        // 1. Check if member CanBorrow() - throw InvalidOperationException if not
        // 2. Call book.Borrow(this.MemberId)
        // 3. Create a new Loan with a unique loan ID (you can use Guid.NewGuid().ToString())
        // 4. Add the loan to _activeLoans
        throw new NotImplementedException();
    }

    /// <summary>
    /// Returns a book and removes it from active loans.
    /// </summary>
    /// <param name="loan">The loan to return</param>
    public void ReturnBook(Loan loan)
    {
        // TODO: Implement
        // 1. Call loan.Return(DateTime.Now)
        // 2. Calculate any fines using loan.CalculateFine()
        // 3. If there are fines, add them using AddFine()
        // 4. Remove the loan from _activeLoans
        throw new NotImplementedException();
    }

    /// <summary>
    /// Adds a fine to the member's account.
    /// </summary>
    /// <param name="amount">The fine amount to add</param>
    public void AddFine(decimal amount)
    {
        // TODO: Implement
        // 1. Add amount to OutstandingFines
        // 2. If OutstandingFines >= MaxFinesBeforeSuspension, automatically Suspend()
        throw new NotImplementedException();
    }

    /// <summary>
    /// Pays off some or all of the outstanding fines.
    /// </summary>
    /// <param name="amount">The amount to pay</param>
    /// <exception cref="ArgumentException">Thrown when amount is negative or exceeds outstanding fines</exception>
    public void PayFine(decimal amount)
    {
        // TODO: Implement
        // 1. Validate amount is positive and doesn't exceed OutstandingFines
        // 2. Subtract amount from OutstandingFines
        // 3. If member was suspended and fines drop below $10, consider auto-activating (optional)
        throw new NotImplementedException();
    }

    /// <summary>
    /// Suspends the member's account.
    /// </summary>
    public void Suspend()
    {
        // TODO: Implement
        // Change Status to Suspended
        throw new NotImplementedException();
    }

    /// <summary>
    /// Activates the member's account.
    /// </summary>
    public void Activate()
    {
        // TODO: Implement
        // Change Status to Active
        throw new NotImplementedException();
    }

    /// <summary>
    /// Marks the member's account as expired.
    /// </summary>
    public void Expire()
    {
        // TODO: Implement
        // Change Status to Expired
        throw new NotImplementedException();
    }
}

public enum MemberStatus
{
    Active,
    Suspended,
    Expired
}