# Exercise 1: Library Lending System - Domain Model & Business Logic

**Due Date**: Jan 27th, 2026  
**Focus**: Domain modeling, OOP principles, business logic, validation

## Overview

Please go through the [signup process for QuickFeed](https://github.com/dat240-2026/info/blob/main/signup.md) before starting the lab.

In this exercise you'll implement the core domain model and business logic for a library lending system.

**Why this matters**: Before we add databases, APIs, and infrastructure, you need to build a solid domain model. Good domain logic is independent of technical concerns - it models the real-world rules and can be thoroughly tested in isolation.

## Approval

- The lab has to be manually approved by the teaching assistants during lab hours.
- The student is expected to explain the code during the manual approval.
  - An approval script is located at the end of the lab, which described the order we expect you to show your implementation in at lab approvals.
- All code has to be submitted to QuickFeed and get 100 % before the deadline, but can be approved in the first lab after the deadline.
- It is possible to get the code approved before the deadline.

## Learning Objectives

By completing this exercise, you will:

- Apply OOP principles to model a real-world domain
- Implement business rules with proper validation
- Manage state transitions safely
- Write defensive code that handles edge cases
- Use meaningful exceptions with clear messages

## What You're Building

You're implementing the core business logic for a library that lends books to members. Your code must enforce all business rules and maintain data integrity without relying on a database or external systems.

### The Domain

A **Library** manages **Books** that can be borrowed by **Members** through **Loans**.

#### Business Rules

##### Books

- Each book has a unique ISBN, title, and author
- A book can be in one of three states: `Available`, `Borrowed`, or `Reserved`
- A book can only be borrowed if it's `Available`
- A book can be reserved if it's currently `Borrowed` (not if already `Reserved`)
- When a borrowed book is returned, if someone has reserved it, it becomes `Reserved` for them; otherwise it becomes `Available`

##### Members

- Each member has a unique member ID, name, and email
- Members have a status: `Active`, `Suspended`, or `Expired`
- Only `Active` members can borrow or reserve books
- Members cannot have more than **5 active loans** at once (active = not yet returned)
- Members cannot borrow books if they have **outstanding fines ≥ $10**
- Members are automatically suspended when fines reach $10 or more

##### Loans

- A loan is created when a member borrows a book
- Loan period is **14 days** from the borrow date
- Overdue fines are calculated as:
  - Days 1-7 overdue: **kr 5.00 per day**
  - Days 8-14 overdue: **kr 10.00 per day**
  - Day 15+ overdue: **kr 20.00 per day**
  - (These are cumulative - 10 days overdue = 7×$0.50 + 3×$1.00 = $6.50)
- A loan can be returned at any time
- Loans track the borrow date, due date, return date (if returned), and calculated fine

##### Reservations

- A member can reserve a book that is currently borrowed
- Only one reservation per book is allowed
- When the book is returned, the member who reserved it gets priority to borrow it
- Reservations expire after **7 days** if the book isn't borrowed by the reserver

## Your Tasks

You are provided with a skeleton project containing:

- Entity class stubs with some properties defined
- Interface definitions for repositories (you won't implement these)
- A set of **public tests** you can run locally

### What You Must Implement

You need to complete the implementation of three main entities and their business logic:

### 1. `Book` Entity

- Constructor must validate that ISBN, title, and author are not null or empty
- `Borrow()` must throw `InvalidOperationException` if book is not available
- `Return()` handles the transition: if reserved, becomes `Reserved`; otherwise `Available`
- `Reserve()` can only be called when book is `Borrowed`
- Include clear, descriptive exception messages

### 2. `Member` Entity

- Constructor must validate member ID, name, and email format (must contain `@`)
- `CanBorrow()` returns false if:
  - Status is not `Active`
  - Member has 5 or more active loans
  - Outstanding fines ≥ kr 100
- `BorrowBook()` must validate using `CanBorrow()` and throw `InvalidOperationException` if not allowed
- `BorrowBook()` must create a `Loan` and add it to active loans
- `AddFine()` automatically suspends member if total fines reach $10+
- `PayFine()` must not allow negative fines

### 3. `Loan` Entity

- Due date is always 14 days from borrow date
- `CalculateFine()` returns `0` if not overdue or already returned
- Fine calculation follows the tiered structure described in business rules
- `Return()` sets the return date and must not allow returning twice
- Use `DateTime` for date calculations (assume `DateTime.Now` for "today")

## Testing Your Code

### Running Public Tests Locally

```bash
cd Lab1
dotnet test
```

The public tests cover basic scenarios. **Passing all public tests does NOT guarantee a pass in QuickFeed** - our QuickFeed tests are more comprehensive and test edge cases, validation, and error handling.

### What We Test (QuickFeed Tests)

QuickFeed will verify:

- **Happy path scenarios**: Basic borrowing, returning, reserving workflows
- **Business rule enforcement**: All the rules listed above
- **Edge cases**:
  - Borrowing on exactly day 14 (due date)
  - Paying exact fine amount
  - Member with exactly 5 loans
  - Fine calculation at tier boundaries (day 7, day 14)
- **Validation**:
  - Null/empty strings rejected
  - Invalid email formats
  - Negative amounts
  - Invalid state transitions
- **Exception types and messages**:
  - Correct exception types thrown
  - Exception messages are descriptive (not just "Invalid operation")

## Submission

### How to Submit

1. **Complete your implementation** in the three entity files
2. **Run public tests** locally and ensure they pass
3. **Commit your changes** to your Git repository
4. **Push to your lab repository in GitHub**
5. The autograder will run

## Tips for Success

### Common Pitfalls to Avoid

❌ **Don't hardcode dates** - Use `DateTime.Now` and calculate durations  
❌ **Don't use magic numbers** - Define constants: `const int MaxLoans = 5;`  
❌ **Don't return null** - Throw exceptions for invalid operations  
❌ **Don't use generic exceptions** - `InvalidOperationException` with message is better than `Exception`  
❌ **Don't forget validation** - Always validate constructor parameters  

### Debugging Strategy

1. **Start with public tests**: Get those passing first
2. **Feel free to add your own tests**: Write tests for edge cases you think of
3. **Use the debugger**: Step through your fine calculation logic
4. **Read exception messages in QuickFeed**: Our tests will tell you what's wrong
5. **Check boundary conditions**: Day 7 vs 8 overdue, exactly 5 loans, etc.

## Getting Help

In preferred order:

- **Discord**: `#lab1` channel for questions.
- **Lab hours**: Ask a TA to help out
- **Office Hours**: Ask Glenn after regular lectures

## Resources

- [C# Properties](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/properties)
- [Exception Handling Best Practices](https://docs.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions)
- [DateTime and TimeSpan](https://docs.microsoft.com/en-us/dotnet/api/system.datetime)
