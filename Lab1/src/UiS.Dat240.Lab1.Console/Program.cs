// See https://aka.ms/new-console-template for more information

using UiS.Dat240.Lab1.Domain.Entities;

class Program
{
    private static List<Book> _books = new();
    private static List<Member> _members = new();
    private static Member _currentUser = null!;
    private static DateTime _currentDate = new DateTime(2024, 1, 15);

    static void Main(string[] args)
    {
        SeedData();

        Console.Clear();
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("╔════════════════════════════════════════════════════════════╗");
        Console.WriteLine("║        Library System - Interactive Approval Script        ║");
        Console.WriteLine("╚════════════════════════════════════════════════════════════╝");
        Console.ResetColor();
        Console.WriteLine();

        while (true)
        {
            ShowStatus();
            ShowMenu();

            Console.Write("\nSelect option: ");
            var choice = Console.ReadLine();
            Console.WriteLine();

            try
            {
                if (!HandleMenuChoice(choice))
                    break;
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"\n✗ Error: {ex.GetType().Name}");
                Console.WriteLine($"  Message: {ex.Message}");
                Console.ResetColor();
            }

            Console.WriteLine("\nPress any key to continue...");
            Console.ReadKey(true);
        }
    }

    static void SeedData()
    {
        // Create 10 books
        _books.Add(new Book("978-0-201-63361-0", "Design Patterns", "Gang of Four"));
        _books.Add(new Book("978-0-13-468599-1", "Refactoring", "Martin Fowler"));
        _books.Add(new Book("978-0-321125217", "Domain-Driven Design", "Eric Evans"));
        _books.Add(new Book("978-0-13-595705-9", "The Pragmatic Programmer", "Hunt & Thomas"));
        _books.Add(new Book("978-0-596007126", "Head First Design Patterns", "Freeman et al"));
        _books.Add(new Book("978-0-13-475759-9", "Working Effectively with Legacy Code", "Feathers"));
        _books.Add(new Book("978-0-321278654", "Extreme Programming Explained", "Kent Beck"));
        _books.Add(new Book("978-0-13-235088-4", "Test Driven Development", "Kent Beck"));
        _books.Add(new Book("978-0-321601919", "Continuous Delivery", "Humble & Farley"));
        _books.Add(new Book("978-0-13-409266-9", "The DevOps Handbook", "Kim et al"));

        // Create 3 members
        _members.Add(new Member("M001", "Alice Johnson", "alice@example.com"));
        _members.Add(new Member("M002", "Bob Smith", "bob@example.com"));
        _members.Add(new Member("M003", "Charlie Brown", "charlie@example.com"));

        // Current user is Alice
        _currentUser = _members[0];

        // Bob and Charlie have borrowed books
        _members[1].BorrowBook(_books[0]); // Bob borrowed Design Patterns
        _members[2].BorrowBook(_books[1]); // Charlie borrowed Refactoring
    }

    static void ShowStatus()
    {
        Console.Clear();
        Console.WriteLine(new string('═', 70));
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine($"Current Date: {_currentDate:yyyy-MM-dd}");
        Console.ResetColor();
        Console.WriteLine(new string('═', 70));

        // Show current user status
        Console.WriteLine();
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine($"Current User: {_currentUser.Name} ({_currentUser.MemberId})");
        Console.ResetColor();
        Console.WriteLine($"  Status: {_currentUser.Status}");
        Console.WriteLine($"  Fines: ${_currentUser.OutstandingFines:F2}");
        Console.WriteLine($"  Active Loans: {_currentUser.ActiveLoans.Count}/5");
        Console.WriteLine($"  Can Borrow: {(_currentUser.CanBorrow() ? "Yes" : "No")}");

        if (_currentUser.ActiveLoans.Count > 0)
        {
            Console.WriteLine("\n  Your Loans:");
            for (int i = 0; i < _currentUser.ActiveLoans.Count; i++)
            {
                var loan = _currentUser.ActiveLoans[i];
                var book = _books.First(b => b.ISBN == loan.BookISBN);
                var status = loan.IsOverdue ? "OVERDUE" : $"Due {loan.DueDate:MM/dd}";
                var fine = loan.CalculateFine();
                var fineStr = fine > 0 ? $" [Fine: ${fine:F2}]" : "";
                Console.WriteLine($"    [{i}] {book.Title}{fineStr}");
                Console.WriteLine($"        Status: {status}");
            }
        }

        // Show books status
        Console.WriteLine();
        Console.WriteLine(new string('-', 70));
        Console.WriteLine("LIBRARY BOOKS:");
        Console.WriteLine(new string('-', 70));
        Console.WriteLine($"{"#",-3} {"Title",-35} {"Status",-15} {"Reserved For"}");
        Console.WriteLine(new string('-', 70));

        for (int i = 0; i < _books.Count; i++)
        {
            var book = _books[i];
            var statusColor = book.Status switch
            {
                BookStatus.Available => ConsoleColor.Green,
                BookStatus.Borrowed => ConsoleColor.Yellow,
                BookStatus.Reserved => ConsoleColor.Magenta,
                _ => ConsoleColor.White
            };

            Console.Write($"{i,-3} ");
            Console.Write($"{TruncateString(book.Title, 35),-35} ");

            Console.ForegroundColor = statusColor;
            Console.Write($"{book.Status,-15} ");
            Console.ResetColor();

            Console.WriteLine(book.ReservedForMemberId ?? "");
        }

        // Show other members
        Console.WriteLine();
        Console.WriteLine(new string('-', 70));
        Console.WriteLine("OTHER MEMBERS:");
        Console.WriteLine(new string('-', 70));

        foreach (var member in _members.Where(m => m.MemberId != _currentUser.MemberId))
        {
            Console.WriteLine($"{member.Name} ({member.MemberId}) - " +
                            $"Status: {member.Status}, " +
                            $"Loans: {member.ActiveLoans.Count}, " +
                            $"Fines: ${member.OutstandingFines:F2}");
        }
    }

    static void ShowMenu()
    {
        Console.WriteLine();
        Console.WriteLine(new string('═', 70));
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("MENU");
        Console.ResetColor();
        Console.WriteLine(new string('═', 70));
        Console.WriteLine("1. Borrow a book");
        Console.WriteLine("2. Return a book");
        Console.WriteLine("3. Reserve a book");
        Console.WriteLine("4. Cancel reservation");
        Console.WriteLine();
        Console.WriteLine("5. Add fine to current user");
        Console.WriteLine("6. Pay fine");
        Console.WriteLine("7. Change member status");
        Console.WriteLine("8. Switch current user");
        Console.WriteLine();
        Console.WriteLine("9. Pass time (advance days)");
        Console.WriteLine("10. Show detailed book info");
        Console.WriteLine("11. Show detailed member info");
        Console.WriteLine();
        Console.WriteLine("0. Exit");
        Console.WriteLine(new string('═', 70));
    }

    static bool HandleMenuChoice(string? choice)
    {
        switch (choice)
        {
            case "1":
                BorrowBook();
                break;
            case "2":
                ReturnBook();
                break;
            case "3":
                ReserveBook();
                break;
            case "4":
                CancelReservation();
                break;
            case "5":
                AddFine();
                break;
            case "6":
                PayFine();
                break;
            case "7":
                ChangeMemberStatus();
                break;
            case "8":
                SwitchUser();
                break;
            case "9":
                PassTime();
                break;
            case "10":
                ShowBookDetails();
                break;
            case "11":
                ShowMemberDetails();
                break;
            case "0":
                Console.WriteLine("Exiting approval script...");
                return false;
            default:
                Console.WriteLine("Invalid option");
                break;
        }
        return true;
    }

    static void BorrowBook()
    {
        Console.Write("Enter book number to borrow: ");
        if (!int.TryParse(Console.ReadLine(), out int bookIndex) ||
            bookIndex < 0 || bookIndex >= _books.Count)
        {
            Console.WriteLine("Invalid book number");
            return;
        }

        var book = _books[bookIndex];

        if (!_currentUser.CanBorrow())
        {
            Console.WriteLine($"\n✗ Cannot borrow: ");
            if (_currentUser.Status != MemberStatus.Active)
                Console.WriteLine($"  - Member status is {_currentUser.Status}");
            if (_currentUser.ActiveLoans.Count >= 5)
                Console.WriteLine("  - Already has 5 active loans");
            if (_currentUser.OutstandingFines >= 10)
                Console.WriteLine($"  - Outstanding fines (${_currentUser.OutstandingFines:F2}) exceed $10");
            return;
        }

        Console.WriteLine($"\nAttempting to borrow: {book.Title}");
        Console.WriteLine($"Current status: {book.Status}");

        _currentUser.BorrowBook(book);

        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine($"\n✓ Successfully borrowed: {book.Title}");
        Console.WriteLine($"  Due date: {_currentUser.ActiveLoans.Last().DueDate:yyyy-MM-dd}");
        Console.ResetColor();
    }

    static void ReturnBook()
    {
        if (_currentUser.ActiveLoans.Count == 0)
        {
            Console.WriteLine("No books to return");
            return;
        }

        Console.WriteLine("\nYour borrowed books:");
        for (int i = 0; i < _currentUser.ActiveLoans.Count; i++)
        {
            var loan = _currentUser.ActiveLoans[i];
            var book = _books.First(b => b.ISBN == loan.BookISBN);
            Console.WriteLine($"  [{i}] {book.Title}");
        }

        Console.Write("\nEnter loan number to return: ");
        if (!int.TryParse(Console.ReadLine(), out int loanIndex) ||
            loanIndex < 0 || loanIndex >= _currentUser.ActiveLoans.Count)
        {
            Console.WriteLine("Invalid loan number");
            return;
        }

        var loanToReturn = _currentUser.ActiveLoans[loanIndex];
        var returnedBook = _books.First(b => b.ISBN == loanToReturn.BookISBN);
        var fine = loanToReturn.CalculateFine();

        Console.WriteLine($"\nReturning: {returnedBook.Title}");
        Console.WriteLine($"Borrowed: {loanToReturn.BorrowDate:yyyy-MM-dd}");
        Console.WriteLine($"Due: {loanToReturn.DueDate:yyyy-MM-dd}");

        if (fine > 0)
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine($"Fine: ${fine:F2} ({loanToReturn.GetDaysOverdue()} days overdue)");
            Console.ResetColor();
        }

        _currentUser.ReturnBook(loanToReturn);

        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine($"\n✓ Book returned");
        Console.WriteLine($"  New book status: {returnedBook.Status}");
        if (returnedBook.ReservedForMemberId != null)
            Console.WriteLine($"  Reserved for: {returnedBook.ReservedForMemberId}");
        Console.ResetColor();
    }

    static void ReserveBook()
    {
        Console.Write("Enter book number to reserve: ");
        if (!int.TryParse(Console.ReadLine(), out int bookIndex) ||
            bookIndex < 0 || bookIndex >= _books.Count)
        {
            Console.WriteLine("Invalid book number");
            return;
        }

        var book = _books[bookIndex];

        Console.WriteLine($"\nAttempting to reserve: {book.Title}");
        Console.WriteLine($"Current status: {book.Status}");

        book.Reserve(_currentUser.MemberId);

        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine($"\n✓ Successfully reserved: {book.Title}");
        Console.ResetColor();
    }

    static void CancelReservation()
    {
        var reservedBooks = _books.Where(b => b.ReservedForMemberId == _currentUser.MemberId).ToList();

        if (reservedBooks.Count == 0)
        {
            Console.WriteLine("You have no reservations");
            return;
        }

        Console.WriteLine("\nYour reservations:");
        for (int i = 0; i < reservedBooks.Count; i++)
        {
            Console.WriteLine($"  [{i}] {reservedBooks[i].Title}");
        }

        Console.Write("\nEnter reservation number to cancel: ");
        if (!int.TryParse(Console.ReadLine(), out int resIndex) ||
            resIndex < 0 || resIndex >= reservedBooks.Count)
        {
            Console.WriteLine("Invalid reservation number");
            return;
        }

        var book = reservedBooks[resIndex];
        book.CancelReservation();

        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine($"\n✓ Cancelled reservation for: {book.Title}");
        Console.ResetColor();
    }

    static void AddFine()
    {
        Console.Write("Enter fine amount: $");
        if (!decimal.TryParse(Console.ReadLine(), out decimal amount) || amount <= 0)
        {
            Console.WriteLine("Invalid amount");
            return;
        }

        var oldStatus = _currentUser.Status;
        var oldFines = _currentUser.OutstandingFines;

        _currentUser.AddFine(amount);

        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine($"\n✓ Added ${amount:F2} in fines");
        Console.WriteLine($"  Total fines: ${oldFines:F2} → ${_currentUser.OutstandingFines:F2}");

        if (oldStatus != _currentUser.Status)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"  Status changed: {oldStatus} → {_currentUser.Status}");
        }
        Console.ResetColor();
    }

    static void PayFine()
    {
        if (_currentUser.OutstandingFines == 0)
        {
            Console.WriteLine("No fines to pay");
            return;
        }

        Console.WriteLine($"Current fines: ${_currentUser.OutstandingFines:F2}");
        Console.Write("Enter payment amount: $");

        if (!decimal.TryParse(Console.ReadLine(), out decimal amount) || amount <= 0)
        {
            Console.WriteLine("Invalid amount");
            return;
        }

        var oldFines = _currentUser.OutstandingFines;
        _currentUser.PayFine(amount);

        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine($"\n✓ Paid ${amount:F2}");
        Console.WriteLine($"  Remaining fines: ${_currentUser.OutstandingFines:F2}");
        Console.ResetColor();
    }

    static void ChangeMemberStatus()
    {
        Console.WriteLine($"\nCurrent status: {_currentUser.Status}");
        Console.WriteLine("\n1. Active");
        Console.WriteLine("2. Suspended");
        Console.WriteLine("3. Expired");
        Console.Write("\nSelect new status: ");

        var choice = Console.ReadLine();
        var oldStatus = _currentUser.Status;

        switch (choice)
        {
            case "1":
                _currentUser.Activate();
                break;
            case "2":
                _currentUser.Suspend();
                break;
            case "3":
                _currentUser.Expire();
                break;
            default:
                Console.WriteLine("Invalid option");
                return;
        }

        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine($"\n✓ Status changed: {oldStatus} → {_currentUser.Status}");
        Console.ResetColor();
    }

    static void SwitchUser()
    {
        Console.WriteLine("\nAvailable members:");
        for (int i = 0; i < _members.Count; i++)
        {
            var marker = _members[i].MemberId == _currentUser.MemberId ? " (current)" : "";
            Console.WriteLine($"  [{i}] {_members[i].Name} ({_members[i].MemberId}){marker}");
        }

        Console.Write("\nSelect member: ");
        if (!int.TryParse(Console.ReadLine(), out int index) ||
            index < 0 || index >= _members.Count)
        {
            Console.WriteLine("Invalid member number");
            return;
        }

        _currentUser = _members[index];
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine($"\n✓ Switched to: {_currentUser.Name}");
        Console.ResetColor();
    }

    static void PassTime()
    {
        Console.Write("Enter number of days to advance: ");
        if (!int.TryParse(Console.ReadLine(), out int days) || days <= 0)
        {
            Console.WriteLine("Invalid number of days");
            return;
        }

        _currentDate = _currentDate.AddDays(days);

        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine($"\n⏰ Time advanced by {days} day(s)");
        Console.WriteLine($"   New date: {_currentDate:yyyy-MM-dd}");
        Console.ResetColor();

        // Show any loans that became overdue
        Console.WriteLine("\nOverdue loans:");
        foreach (var member in _members)
        {
            foreach (var loan in member.ActiveLoans.Where(l => l.IsOverdue))
            {
                var book = _books.First(b => b.ISBN == loan.BookISBN);
                var fine = loan.CalculateFine();
                Console.WriteLine($"  • {member.Name}: {book.Title}");
                Console.WriteLine($"    Due: {loan.DueDate:yyyy-MM-dd}, Fine: ${fine:F2}");
            }
        }
    }

    static void ShowBookDetails()
    {
        Console.Write("Enter book number: ");
        if (!int.TryParse(Console.ReadLine(), out int bookIndex) ||
            bookIndex < 0 || bookIndex >= _books.Count)
        {
            Console.WriteLine("Invalid book number");
            return;
        }

        var book = _books[bookIndex];

        Console.WriteLine("\n" + new string('=', 60));
        Console.WriteLine($"BOOK DETAILS: {book.Title}");
        Console.WriteLine(new string('=', 60));
        Console.WriteLine($"ISBN: {book.ISBN}");
        Console.WriteLine($"Author: {book.Author}");
        Console.WriteLine($"Status: {book.Status}");
        Console.WriteLine($"Reserved For: {book.ReservedForMemberId ?? "(none)"}");
        Console.WriteLine($"Available for Borrowing: {book.IsAvailableForBorrowing()}");
        Console.WriteLine($"Can be Reserved: {book.CanBeReserved()}");
        Console.WriteLine(new string('=', 60));
    }

    static void ShowMemberDetails()
    {
        Console.WriteLine("\nSelect member:");
        for (int i = 0; i < _members.Count; i++)
        {
            Console.WriteLine($"  [{i}] {_members[i].Name}");
        }

        Console.Write("\nMember number: ");
        if (!int.TryParse(Console.ReadLine(), out int index) ||
            index < 0 || index >= _members.Count)
        {
            Console.WriteLine("Invalid member number");
            return;
        }

        var member = _members[index];

        Console.WriteLine("\n" + new string('=', 60));
        Console.WriteLine($"MEMBER DETAILS: {member.Name}");
        Console.WriteLine(new string('=', 60));
        Console.WriteLine($"Member ID: {member.MemberId}");
        Console.WriteLine($"Email: {member.Email}");
        Console.WriteLine($"Status: {member.Status}");
        Console.WriteLine($"Outstanding Fines: ${member.OutstandingFines:F2}");
        Console.WriteLine($"Active Loans: {member.ActiveLoans.Count}/5");
        Console.WriteLine($"Can Borrow: {member.CanBorrow()}");

        if (member.ActiveLoans.Count > 0)
        {
            Console.WriteLine("\nActive Loans:");
            foreach (var loan in member.ActiveLoans)
            {
                var book = _books.First(b => b.ISBN == loan.BookISBN);
                var fine = loan.CalculateFine();
                Console.WriteLine($"  • {book.Title}");
                Console.WriteLine($"    Borrowed: {loan.BorrowDate:yyyy-MM-dd}");
                Console.WriteLine($"    Due: {loan.DueDate:yyyy-MM-dd}");
                Console.WriteLine($"    Overdue: {loan.IsOverdue}");
                if (fine > 0)
                    Console.WriteLine($"    Fine: ${fine:F2}");
            }
        }
        Console.WriteLine(new string('=', 60));
    }

    static string TruncateString(string str, int maxLength)
    {
        if (str.Length <= maxLength)
            return str;
        return str.Substring(0, maxLength - 3) + "...";
    }
}
