using UiS.Dat240.Lab1.Domain.Entities;

namespace UiS.Dat240.Lab1.Tests.PublicTests;


[TestFixture]
public class BookTests
{
    [Test]
    public void Constructor_WithValidParameters_CreatesBook()
    {
        // Arrange & Act
        var book = new Book("978-0-123456-78-9", "Test Book", "Test Author");

        // Assert
        Assert.That(book.ISBN, Is.EqualTo("978-0-123456-78-9"));
        Assert.That(book.Title, Is.EqualTo("Test Book"));
        Assert.That(book.Author, Is.EqualTo("Test Author"));
        Assert.That(book.Status, Is.EqualTo(BookStatus.Available));
    }

    [Test]
    public void Constructor_WithEmptyISBN_ThrowsArgumentException()
    {
        // Act & Assert
        Assert.Throws<ArgumentException>(() =>
            new Book("", "Test Book", "Test Author"));
    }

    [Test]
    public void Borrow_WhenAvailable_ChangesStatusToBorrowed()
    {
        // Arrange
        var book = new Book("978-0-123456-78-9", "Test Book", "Test Author");

        // Act
        book.Borrow("M001");

        // Assert
        Assert.That(book.Status, Is.EqualTo(BookStatus.Borrowed));
    }

    [Test]
    public void Borrow_WhenAlreadyBorrowed_ThrowsInvalidOperationException()
    {
        // Arrange
        var book = new Book("978-0-123456-78-9", "Test Book", "Test Author");
        book.Borrow("M001");

        // Act & Assert
        Assert.Throws<InvalidOperationException>(() => book.Borrow("M002"));
    }

    [Test]
    public void Return_WhenBorrowed_ChangesStatusToAvailable()
    {
        // Arrange
        var book = new Book("978-0-123456-78-9", "Test Book", "Test Author");
        book.Borrow("M001");

        // Act
        book.Return();

        // Assert
        Assert.That(book.Status, Is.EqualTo(BookStatus.Available));
    }

    [Test]
    public void Reserve_WhenBorrowed_ChangesStatusToReserved()
    {
        // Arrange
        var book = new Book("978-0-123456-78-9", "Test Book", "Test Author");
        book.Borrow("M001");

        // Act
        book.Reserve("M002");

        // Assert
        Assert.That(book.Status, Is.EqualTo(BookStatus.Reserved));
        Assert.That(book.ReservedForMemberId, Is.EqualTo("M002"));
    }

    [Test]
    public void Reserve_WhenAvailable_ThrowsInvalidOperationException()
    {
        // Arrange
        var book = new Book("978-0-123456-78-9", "Test Book", "Test Author");

        // Act & Assert
        Assert.Throws<InvalidOperationException>(() => book.Reserve("M001"));
    }

    [Test]
    public void IsAvailableForBorrowing_WhenAvailable_ReturnsTrue()
    {
        // Arrange
        var book = new Book("978-0-123456-78-9", "Test Book", "Test Author");

        // Act & Assert
        Assert.That(book.IsAvailableForBorrowing(), Is.True);
    }

    [Test]
    public void IsAvailableForBorrowing_WhenBorrowed_ReturnsFalse()
    {
        // Arrange
        var book = new Book("978-0-123456-78-9", "Test Book", "Test Author");
        book.Borrow("M001");

        // Act & Assert
        Assert.That(book.IsAvailableForBorrowing(), Is.False);
    }
}