using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using NUnit.Framework;
using UiS.Dat240.Lab1.Domain.Entities;

namespace UiS.Dat240.Lab1.Tests.PublicTests;

[TestFixture]
public class LoanTests
{
    [Test]
    public void Constructor_SetsPropertiesCorrectly()
    {
        // Arrange
        var borrowDate = new DateTime(2024, 1, 1);

        // Act
        var loan = new Loan("L001", "M001", new Book("978-0-123456-78-9", "Test Book", "Test Author"), borrowDate);

        // Assert
        Assert.That(loan.LoanId, Is.EqualTo("L001"));
        Assert.That(loan.MemberId, Is.EqualTo("M001"));
        Assert.That(loan.Book.ISBN, Is.EqualTo("978-0-123456-78-9"));
        Assert.That(loan.BorrowDate, Is.EqualTo(borrowDate));
        Assert.That(loan.DueDate, Is.EqualTo(borrowDate.AddDays(14)));
        Assert.That(loan.IsReturned, Is.False);
    }

    [Test]
    public void CalculateFine_WhenNotOverdue_ReturnsZero()
    {
        // Arrange
        var borrowDate = DateTime.Now.AddDays(-5);
        var loan = new Loan("L001", "M001", new Book("978-0-123456-78-9", "Test Book", "Test Author"), borrowDate);

        // Act
        var fine = loan.CalculateFine();

        // Assert
        Assert.That(fine, Is.EqualTo(0));
    }

    [Test]
    public void CalculateFine_When5DaysOverdue_CalculatesCorrectly()
    {
        // Arrange
        var borrowDate = DateTime.Now.AddDays(-19); // 19 days ago, so 5 days overdue
        var loan = new Loan("L001", "M001", new Book("978-0-123456-78-9", "Test Book", "Test Author"), borrowDate);

        // Act
        var fine = loan.CalculateFine();

        // Assert
        // 5 days × kr 5.00 = kr 25.00
        Assert.That(fine, Is.EqualTo(25.0m));
    }

    [Test]
    public void CalculateFine_When10DaysOverdue_CalculatesCorrectly()
    {
        // Arrange
        var borrowDate = DateTime.Now.AddDays(-24); // 24 days ago, so 10 days overdue
        var loan = new Loan("L001", "M001", new Book("978-0-123456-78-9", "Test Book", "Test Author"), borrowDate);

        // Act
        var fine = loan.CalculateFine();

        // Assert
        // (7 days × kr 5.00) + (3 days × kr 10.00) = kr 35.00 + kr 30.00 = kr 65.00
        Assert.That(fine, Is.EqualTo(65.00m));
    }

    [Test]
    public void CalculateFine_When20DaysOverdue_CalculatesCorrectly()
    {
        // Arrange
        var borrowDate = DateTime.Now.AddDays(-34); // 34 days ago, so 20 days overdue
        var loan = new Loan("L001", "M001", new Book("978-0-123456-78-9", "Test Book", "Test Author"), borrowDate);

        // Act
        var fine = loan.CalculateFine();

        // Assert
        // (7 × kr 5.00) + (7 × kr 10.00) + (6 × kr 20.00) = kr 35.00 + kr 70.00 + kr 120.00 = kr 225.00
        Assert.That(fine, Is.EqualTo(225.00m));
    }

    [Test]
    public void CalculateFine_WhenReturned_ReturnsZero()
    {
        // Arrange
        var borrowDate = DateTime.Now.AddDays(-30);
        var loan = new Loan("L001", "M001", new Book("978-0-123456-78-9", "Test Book", "Test Author"), borrowDate);
        loan.Return(DateTime.Now);

        // Act
        var fine = loan.CalculateFine();

        // Assert
        Assert.That(fine, Is.EqualTo(0));
    }

    [Test]
    public void Return_SetsReturnDate()
    {
        // Arrange
        var loan = new Loan("L001", "M001", new Book("978-0-123456-78-9", "Test Book", "Test Author"), DateTime.Now.AddDays(-5));
        var returnDate = DateTime.Now;

        // Act
        loan.Return(returnDate);

        // Assert
        Assert.That(loan.IsReturned, Is.True);
        Assert.That(loan.ReturnDate, Is.EqualTo(returnDate));
    }

    [Test]
    public void Return_WhenAlreadyReturned_ThrowsInvalidOperationException()
    {
        // Arrange
        var loan = new Loan("L001", "M001", new Book("978-0-123456-78-9", "Test Book", "Test Author"), DateTime.Now.AddDays(-5));
        loan.Return(DateTime.Now);

        // Act & Assert
        Assert.Throws<InvalidOperationException>(() => loan.Return(DateTime.Now));
    }

    [Test]
    public void IsOverdue_WhenPastDueDate_ReturnsTrue()
    {
        // Arrange
        var borrowDate = DateTime.Now.AddDays(-20); // Borrowed 20 days ago
        var loan = new Loan("L001", "M001", new Book("978-0-123456-78-9", "Test Book", "Test Author"), borrowDate);

        // Act & Assert
        Assert.That(loan.IsOverdue, Is.True);
    }

    [Test]
    public void IsOverdue_WhenNotPastDueDate_ReturnsFalse()
    {
        // Arrange
        var borrowDate = DateTime.Now.AddDays(-5); // Borrowed 5 days ago
        var loan = new Loan("L001", "M001", new Book("978-0-123456-78-9", "Test Book", "Test Author"), borrowDate);

        // Act & Assert
        Assert.That(loan.IsOverdue, Is.False);
    }
}