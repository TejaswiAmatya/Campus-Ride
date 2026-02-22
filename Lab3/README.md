# Exercise 3: Order Processing System - Domain Events & In-Process Messaging

**Due Date**: Mar 10th, 2026  
**Focus**: Domain Events, MediatR Notifications, Event-Driven Architecture, Event Handlers

## Overview

In this exercise, you'll implement an order processing system that uses domain events to coordinate actions across different parts of the application. When significant business events occur (like placing an order), your code will publish events that multiple handlers can react to independently.

**Why this matters**: Event-driven architecture allows different parts of your system to react to changes without tight coupling. Instead of one big method that does everything, you publish an event and let specialized handlers take care of their specific concerns. This makes code more maintainable, testable, and easier to extend.

## Learning Objectives

By completing this exercise, you will:

- Understand domain events and when to use them
- Implement event publishing with MediatR notifications
- Write event handlers that respond to domain events
- Coordinate multiple handlers responding to the same event
- Understand the difference between Commands and Events
- Learn how to design event-driven workflows

## What You're Building

You're implementing an order processing system where placing an order triggers multiple automated actions:

### Domain Event: OrderPlaced

When an order is placed, the system publishes an `OrderPlaced` event that triggers three handlers:

1. **SendConfirmationEmailHandler** - Sends a confirmation email to the customer
2. **UpdateInventoryHandler** - Reduces stock levels for ordered items
3. **CreateShipmentHandler** - Creates a shipment record (only if all items are in stock)

### Feature: PlaceOrder (Command)

Places a new order and publishes the OrderPlaced event.

**Business Rules:**

- Order must have at least one item
- All items must exist in the product catalog
- Customer email must be valid (contains @)
- Payment method is required (CreditCard, DebitCard, or PayPal)
- Order is created first, then OrderPlaced event is published
- All event handlers execute automatically in response to the event

## Your Tasks

You will implement **one command** and **three event handlers**:

### Task 1: Implement `PlaceOrder` Command

**File**: `src/UiS.Dat240.Lab3.Api/Features/Orders/PlaceOrder.cs`

This command:

1. Validates the order (items exist, email valid, etc.)
2. Creates an Order entity
3. **Publishes OrderPlaced event** (this is the key part!)
4. Returns OrderDto

**Command Properties:**

- `string CustomerEmail` - Customer's email address
- `List<OrderItemDto> Items` - List of items to order (ProductId, Quantity)
- `string PaymentMethod` - Payment method (CreditCard, DebitCard, PayPal)

**Validation Rules:**

- CustomerEmail must contain '@'
- Items list must not be empty
- Each item must have Quantity > 0
- PaymentMethod must be one of: "CreditCard", "DebitCard", "PayPal"

**Handler Steps:**

1. Validate all product IDs exist using `IProductRepository`
2. Create Order entity with generated OrderId
3. Save order to `IOrderRepository`
4. **Publish OrderPlaced event** using `IPublisher.Publish()`
5. Return OrderDto

### Task 2: Implement `SendConfirmationEmailHandler`

**File**: `src/UiS.Dat240.Lab3.Api/Features/Orders/Events/SendConfirmationEmailHandler.cs`

This handler responds to `OrderPlaced` events by recording that an email was sent.

**Handler Steps:**

1. Get the order from repository using event.OrderId
2. Set `order.ConfirmationEmailSent = true`
3. Update order in repository

### Task 3: Implement `UpdateInventoryHandler`

**File**: `src/UiS.Dat240.Lab3.Api/Features/Orders/Events/UpdateInventoryHandler.cs`

This handler responds to `OrderPlaced` events by reducing product stock.

**Handler Steps:**

1. For each item in the event:
   - Get product from repository
   - Reduce stock by ordered quantity
   - Update product in repository

### Task 4: Implement `CreateShipmentHandler`

**File**: `src/UiS.Dat240.Lab3.Api/Features/Orders/Events/CreateShipmentHandler.cs`

This handler responds to `OrderPlaced` events by creating a shipment (if possible).

**Handler Steps:**

1. Check if all ordered products have sufficient stock
2. If yes: Create shipment and set `order.ShipmentCreated = true`
3. If no: Do nothing (shipment is not created)
4. Update order in repository

**Note**: This handler should check stock levels but NOT modify them (that's UpdateInventoryHandler's job).

## Testing Your Code

### Running Public Tests Locally

```bash
cd Lab3
dotnet test
```

The public tests cover basic scenarios. **Passing all public tests does NOT guarantee a pass in QuickFeed**.

### What We Test (QuickFeed Tests)

Our grading tests verify:

- **Command execution**: PlaceOrder creates order and publishes event
- **Event publishing**: OrderPlaced event is actually published
- **Event handlers**: All three handlers execute in response to event
- **Handler logic**: Each handler performs its specific task correctly
- **Validation**: Command validation rules properly implemented
- **Edge cases**: Stock insufficiency, multiple items, handler independence
- **Event sequence**: Events published after order is created

## Submission

### File Structure

You will modify these files:

```md
src/UiS.Dat240.Lab3.Api/Features/Orders/
├── PlaceOrder.cs                          ← YOU MODIFY THIS
└── Events/
    ├── OrderPlaced.cs                     ← Provided (domain event)
    ├── SendConfirmationEmailHandler.cs    ← YOU MODIFY THIS
    ├── UpdateInventoryHandler.cs          ← YOU MODIFY THIS
    └── CreateShipmentHandler.cs           ← YOU MODIFY THIS
```

### How to Submit

1. **Complete your implementation** in the four files
2. **Run public tests** locally and ensure they pass
3. **Commit your changes** to your Git repository
4. **Push to your lab repository in GitHub**
5. The autograder will run

### Submission Checklist

- [ ] All public tests pass locally
- [ ] Code compiles without warnings
- [ ] PlaceOrder publishes OrderPlaced event
- [ ] All three event handlers are implemented
- [ ] Handlers use `INotificationHandler<OrderPlaced>`
- [ ] Validation rules are implemented
- [ ] Code follows C# naming conventions
- [ ] No `Console.WriteLine` statements

## Tips for Success

### Events vs Commands

**Commands** (Exercise 2):

- Represent a request to do something
- One handler per command
- Return a result
- Example: `CreateProduct.Command`

**Events** (Exercise 3):

- Represent something that happened
- Zero or more handlers per event
- Don't return results
- Example: `OrderPlaced`

### MediatR Event Pattern

**Defining an Event (Notification):**

```csharp
public record OrderPlaced(Guid OrderId, string CustomerEmail, List<OrderItem> Items) 
    : INotification;
```

**Publishing an Event:**

```csharp
public class Handler : IRequestHandler<Command, OrderDto>
{
    private readonly IPublisher _publisher;
    
    public Handler(IPublisher publisher)
    {
        _publisher = publisher;
    }
    
    public async Task<OrderDto> Handle(Command request, CancellationToken ct)
    {
        // ... create order ...
        
        // Publish event
        await _publisher.Publish(new OrderPlaced(order.Id, order.CustomerEmail, order.Items), ct);
        
        return orderDto;
    }
}
```

**Handling an Event:**

```csharp
public class SendConfirmationEmailHandler : INotificationHandler<OrderPlaced>
{
    private readonly IOrderRepository _orderRepository;
    
    public SendConfirmationEmailHandler(IOrderRepository orderRepository)
    {
        _orderRepository = orderRepository;
    }
    
    public async Task Handle(OrderPlaced notification, CancellationToken ct)
    {
        var order = await _orderRepository.GetByIdAsync(notification.OrderId);
        order.ConfirmationEmailSent = true;
        await _orderRepository.UpdateAsync(order);
    }
}
```

### Key Differences from Exercise 2

**Exercise 2 (Commands):**

- Used `IRequestHandler<Command, Result>`
- Used `IMediator.Send(command)`
- One handler executes

**Exercise 3 (Events):**

- Use `INotificationHandler<Event>`
- Use `IPublisher.Publish(event)`
- All handlers execute (in parallel by default)

### Validation in PlaceOrder

Use FluentValidation for the command:

```csharp
public class Validator : AbstractValidator<Command>
{
    public Validator()
    {
        RuleFor(x => x.CustomerEmail)
            .NotEmpty()
            .Must(email => email.Contains("@"))
            .WithMessage("Email must contain @");
        
        RuleFor(x => x.Items)
            .NotEmpty()
            .WithMessage("Order must contain at least one item");
        
        RuleForEach(x => x.Items)
            .Must(item => item.Quantity > 0)
            .WithMessage("Item quantity must be greater than 0");
        
        RuleFor(x => x.PaymentMethod)
            .Must(pm => new[] { "CreditCard", "DebitCard", "PayPal" }.Contains(pm))
            .WithMessage("Payment method must be CreditCard, DebitCard, or PayPal");
    }
}
```

### Common Pitfalls

❌ **Don't forget to publish the event** - This is the most important part!  
❌ **Don't return results from event handlers** - Events are fire-and-forget  
❌ **Don't make handlers depend on each other** - Each should work independently  
❌ **Don't publish events before saving** - Create and save order first, then publish  
❌ **Don't use `IMediator.Send()` for events** - Use `IPublisher.Publish()`  

### Handler Independence

Each event handler should work independently:

- `SendConfirmationEmailHandler` only cares about marking email sent
- `UpdateInventoryHandler` only cares about reducing stock
- `CreateShipmentHandler` only cares about creating shipment

They should NOT:

- Call each other directly
- Share state between handlers
- Assume execution order

## Getting Help

In preferred order:

- **Discord**: `#lab3` channel for questions.
- **Lab hours**: Ask a TA to help out
- **Office Hours**: Ask Glenn after regular lectures

## Resources

- [MediatR Notifications](https://github.com/LuckyPennySoftware/MediatR/wiki#notifications)
- [Domain Events Pattern](https://docs.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/domain-events-design-implementation)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
