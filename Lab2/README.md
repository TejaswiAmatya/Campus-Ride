# Exercise 2: Product Inventory Management - MediatR Feature Slice with Validation

**Due Date**: Feb 17th, 2026  
**Focus**: Vertical Slice Architecture, MediatR, FluentValidation, CQRS

## Overview

In this exercise, you'll implement a product inventory management system using Vertical Slice Architecture (VSA) with MediatR. Each feature is organized as a self-contained vertical slice with its command/query, handler, and validator.

**Why this matters**: VSA organizes code by features rather than technical layers. This makes it easier to understand, modify, and test individual features without navigating through multiple projects and folders.

## Learning Objectives

By completing this exercise, you will:

- Organize code using Vertical Slice Architecture
- Use MediatR for implementing the CQRS pattern
- Apply FluentValidation for input validation
- Understand the difference between Commands and Queries
- Write handlers that encapsulate business logic

## What You're Building

You're implementing three features for a product inventory management system:

### Feature 1: CreateProduct (Command)

Creates a new product in the inventory.

**Business Rules:**

- Name is required and must be 3-100 characters
- SKU is required and must match format: `[A-Z]{3}-[0-9]{4}` (e.g., "ABC-1234")
- Price must be greater than 0
- Stock must be 0 or greater
- SKU must be unique (not already exist)

### Feature 2: UpdateStock (Command)

Updates the stock level of a product by a delta (can be positive or negative).

**Business Rules:**

- Product must exist
- Stock adjustment can be positive (adding stock) or negative (removing stock)
- Final stock cannot be negative after adjustment
- Returns the updated product

### Feature 3: GetProductsBelowThreshold (Query)

Retrieves all products where stock is below a specified threshold.

**Business Rules:**

- Threshold must be greater than 0
- Returns list of products sorted by stock level (lowest first)
- Returns empty list if no products below threshold

## Your Tasks

### 1. Implement `CreateProduct` Feature

**File**: `src/UiS.Dat240.Lab2.Api/Features/Products/CreateProduct.cs`

```csharp
// TODO: Implement the following nested classes:
// - Command: Contains Name, SKU, Price, Stock
// - Validator: Uses FluentValidation to validate Command
// - Handler: Creates product and saves to repository
// - Returns: ProductDto with Id, Name, SKU, Price, Stock
```

**Requirements:**

- Command must have properties: `string Name`, `string SKU`, `decimal Price`, `int Stock`
- Validator must check:
  - Name is not empty and length between 3-100
  - SKU matches pattern `[A-Z]{3}-[0-9]{4}`
  - `Price > 0`
  - `Stock >= 0`
- Handler must:
  - Check if SKU already exists (throw `InvalidOperationException` if it does)
  - Create new Product with generated ID
  - Save to repository
  - Return `ProductDto`

### 2. Implement `UpdateStock` Feature

**File**: `src/UiS.Dat240.Lab2.Api/Features/Products/UpdateStock.cs`

```csharp
// TODO: Implement the following nested classes:
// - Command: Contains ProductId (Guid), StockDelta (int)
// - Validator: Uses FluentValidation to validate Command
// - Handler: Updates product stock
// - Returns: ProductDto with updated stock
```

**Requirements:**

- Command must have properties: `Guid ProductId`, `int StockDelta`
- Validator must check:
  - `ProductId` is not empty (not `Guid.Empty`)
- Handler must:
  - Check if product exists (throw `KeyNotFoundException` if not)
  - Check if new stock would be negative (throw `InvalidOperationException` if so)
  - Update stock: `product.Stock += StockDelta`
  - Save to repository
  - Return `ProductDto`

### 3. Implement `GetProductsBelowThreshold` Query

**File**: `src/UiS.Dat240.Lab2.Api/Features/Products/GetProductsBelowThreshold.cs`

```csharp
// TODO: Implement the following nested classes:
// - Query: Contains Threshold (int)
// - Validator: Uses FluentValidation to validate Query
// - Handler: Retrieves products below threshold
// - Returns: List<ProductDto> sorted by stock ascending
```

**Requirements:**

- Query must have property: `int Threshold`
- Validator must check:
  - `Threshold > 0`
- Handler must:
  - Get all products from repository
  - Filter where `Stock < Threshold`
  - Sort by Stock ascending
  - Return list of `ProductDto`

## Testing Your Code

### Running Public Tests Locally

```bash
cd Lab2
dotnet test
```

The public tests cover basic scenarios. **Passing all public tests does NOT guarantee a pass in QuickFeed**.

### What We Test (QuickFeed Tests)

Our grading tests verify:

- **Happy path**: All features work correctly with valid input
- **Validation**: FluentValidation rules properly implemented
- **Business rules**: SKU uniqueness, stock calculations, filtering logic
- **Edge cases**: Boundary conditions, empty results, large adjustments
- **Error handling**: Correct exception types with meaningful messages
- **Async patterns**: Proper use of async/await

## Submission

### File Structure

You will modify only these files:

```md
src/UiS.Dat240.Lab2.Api/Features/Products/
├── CreateProduct.cs              ← YOU MODIFY THIS
├── UpdateStock.cs                ← YOU MODIFY THIS
└── GetProductsBelowThreshold.cs  ← YOU MODIFY THIS
```

### How to Submit

1. **Complete your implementation** in the three feature files
2. **Run public tests** locally and ensure they pass
3. **Commit your changes** to your Git repository
4. **Push to your lab repository in GitHub**
5. The autograder will run

### Submission Checklist

- [ ] All public tests pass locally
- [ ] Code compiles without warnings
- [ ] All validators use FluentValidation
- [ ] Meaningful exception messages
- [ ] Code follows C# naming conventions
- [ ] No `Console.WriteLine` statements

## Tips for Success

### MediatR Pattern

Each feature file should have this structure:

```csharp
public static class FeatureName
{
    // The request (Command or Query)
    public record Command(...) : IRequest<ReturnType>;
    
    // Validation rules
    public class Validator : AbstractValidator<Command>
    {
        public Validator()
        {
            RuleFor(x => x.Property)...
        }
    }
    
    // Business logic
    public class Handler : IRequestHandler<Command, ReturnType>
    {
        public async Task<ReturnType> Handle(Command request, CancellationToken ct)
        {
            // Implementation
        }
    }
}
```

### FluentValidation Examples

```csharp
// Required field
RuleFor(x => x.Name).NotEmpty().WithMessage("Name is required");

// Length constraint
RuleFor(x => x.Name).Length(3, 100);

// Greater than
RuleFor(x => x.Price).GreaterThan(0);

// Regex pattern
RuleFor(x => x.SKU).Matches(@"^[A-Z]{3}-[0-9]{4}$")
    .WithMessage("SKU must match format ABC-1234");
```

### Common Pitfalls

❌ **Don't use technical layers** - Keep everything for one feature in one file  
❌ **Don't use Data Annotations** - Use FluentValidation instead  
❌ **Don't forget async/await** - All repository calls are async  
❌ **Don't ignore validation** - Every Command/Query needs a Validator  
❌ **Don't throw generic exceptions** - Use specific exception types  

## Getting Help

In preferred order:

- **Discord**: `#lab2` channel for questions.
- **Lab hours**: Ask a TA to help out
- **Office Hours**: Ask Glenn after regular lectures

## Resources

- [MediatR Documentation](https://github.com/LuckyPennySoftware/MediatR/wiki)
- [FluentValidation Documentation](https://docs.fluentvalidation.net/)
- [Vertical Slice Architecture](https://jimmybogard.com/vertical-slice-architecture/)
