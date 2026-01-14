using UiS.Dat240.Lab1.Domain.Entities;

namespace UiS.Dat240.Lab1.Tests.PublicTests;

[TestFixture]
public class MemberTests
{
    [Test]
    public void Constructor_WithValidParameters_CreatesMember()
    {
        // Arrange & Act
        var member = new Member("M001", "John Doe", "john@example.com");

        // Assert
        Assert.That(member.MemberId, Is.EqualTo("M001"));
        Assert.That(member.Name, Is.EqualTo("John Doe"));
        Assert.That(member.Email, Is.EqualTo("john@example.com"));
        Assert.That(member.Status, Is.EqualTo(MemberStatus.Active));
        Assert.That(member.OutstandingFines, Is.EqualTo(0));
    }

    [Test]
    public void Constructor_WithInvalidEmail_ThrowsArgumentException()
    {
        // Act & Assert
        Assert.Throws<ArgumentException>(() =>
            new Member("M001", "John Doe", "invalid-email"));
    }

    [Test]
    public void CanBorrow_WhenActiveMemberWithNoLoans_ReturnsTrue()
    {
        // Arrange
        var member = new Member("M001", "John Doe", "john@example.com");

        // Act & Assert
        Assert.That(member.CanBorrow(), Is.True);
    }

    [Test]
    public void CanBorrow_WhenSuspended_ReturnsFalse()
    {
        // Arrange
        var member = new Member("M001", "John Doe", "john@example.com");
        member.Suspend();

        // Act & Assert
        Assert.That(member.CanBorrow(), Is.False);
    }

    [Test]
    public void CanBorrow_WhenFinesExceedLimit_ReturnsFalse()
    {
        // Arrange
        var member = new Member("M001", "John Doe", "john@example.com");
        member.AddFine(10.00m);

        // Act & Assert
        Assert.That(member.CanBorrow(), Is.False);
    }

    [Test]
    public void AddFine_WhenExceedsLimit_SuspendsMember()
    {
        // Arrange
        var member = new Member("M001", "John Doe", "john@example.com");

        // Act
        member.AddFine(12.00m);

        // Assert
        Assert.That(member.Status, Is.EqualTo(MemberStatus.Suspended));
    }

    [Test]
    public void PayFine_ReducesOutstandingFines()
    {
        // Arrange
        var member = new Member("M001", "John Doe", "john@example.com");
        member.AddFine(5.00m);

        // Act
        member.PayFine(3.00m);

        // Assert
        Assert.That(member.OutstandingFines, Is.EqualTo(2.00m));
    }

    [Test]
    public void BorrowBook_WhenCanBorrow_AddsLoanToActiveLoans()
    {
        // Arrange
        var member = new Member("M001", "John Doe", "john@example.com");
        var book = new Book("978-0-123456-78-9", "Test Book", "Test Author");

        // Act
        member.BorrowBook(book);

        // Assert
        Assert.That(member.ActiveLoans.Count, Is.EqualTo(1));
        Assert.That(book.Status, Is.EqualTo(BookStatus.Borrowed));
    }

    [Test]
    public void BorrowBook_WhenCannotBorrow_ThrowsInvalidOperationException()
    {
        // Arrange
        var member = new Member("M001", "John Doe", "john@example.com");
        member.Suspend();
        var book = new Book("978-0-123456-78-9", "Test Book", "Test Author");

        // Act & Assert
        Assert.Throws<InvalidOperationException>(() => member.BorrowBook(book));
    }
}