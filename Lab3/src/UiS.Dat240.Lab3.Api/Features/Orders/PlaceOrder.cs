using MediatR;
using FluentValidation;
using UiS.Dat240.Lab3.Api.Features.Orders.Domain.Entities;
using UiS.Dat240.Lab3.Api.Features.Orders.Domain.Repositories;
using UiS.Dat240.Lab3.Api.Features.Orders.Events;

namespace UiS.Dat240.Lab3.Api.Features.Orders;

/// <summary>
/// Feature: Place an order and publish OrderPlaced event
/// 
/// TODO: Implement the following nested classes:
/// 1. Command record with properties: CustomerEmail, Items, PaymentMethod
/// 2. Validator class that validates the Command
/// 3. Handler class that creates order and publishes OrderPlaced event
/// 
/// Returns: OrderDto
/// </summary>
public static class PlaceOrder
{
    // TODO: Define Command record that implements IRequest<OrderDto>
    // Properties: 
    //   - string CustomerEmail
    //   - List<OrderItemDto> Items
    //   - string PaymentMethod

    // TODO: Define Validator class that inherits AbstractValidator<Command>
    // Validation rules:
    // - CustomerEmail: NotEmpty, Must contain '@'
    // - Items: NotEmpty (must have at least one item)
    // - Items: Each item must have Quantity > 0 (use RuleForEach)
    // - PaymentMethod: Must be one of "CreditCard", "DebitCard", or "PayPal"

    // TODO: Define Handler class that implements IRequestHandler<Command, OrderDto>
    // Steps:
    // 1. Inject IOrderRepository, IProductRepository, and IPublisher in constructor
    // 2. Validate all product IDs exist using GetByIdAsync (throw KeyNotFoundException if not)
    // 3. Check if all products have sufficient stock:
    //    - For each item, check if product.Stock >= item.Quantity
    //    - Set hasSufficientStock = true only if ALL items have sufficient stock
    // 4. Create Order entity with:
    //    - OrderId = Guid.NewGuid()
    //    - CustomerEmail from request
    //    - PaymentMethod from request
    //    - Items converted from request.Items to List<OrderItem>
    //    - ConfirmationEmailSent = false
    //    - ShipmentCreated = false
    //    - HasSufficientStock = hasSufficientStock (from step 3)
    // 5. Save order using AddAsync
    // 6. IMPORTANT: Publish OrderPlaced event using _publisher.Publish(new OrderPlaced(...))
    // 7. Return OrderDto with order data
}

/// <summary>
/// Data Transfer Objects
/// These are provided for you - do not modify
/// </summary>
public record OrderDto(Guid OrderId, string CustomerEmail, List<OrderItemDto> Items, string PaymentMethod);
public record OrderItemDto(Guid ProductId, int Quantity);