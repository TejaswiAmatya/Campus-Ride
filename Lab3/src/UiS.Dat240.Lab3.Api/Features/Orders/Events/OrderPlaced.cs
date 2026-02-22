using MediatR;
using UiS.Dat240.Lab3.Api.Features.Orders.Domain.Entities;

namespace UiS.Dat240.Lab3.Api.Features.Orders.Events;

/// <summary>
/// Domain event: Published when an order is placed
/// This is provided for you - do not modify
/// 
/// This is a NOTIFICATION (event), not a REQUEST (command/query)
/// Multiple handlers can listen to this event
/// </summary>
public record OrderPlaced(
    Guid OrderId,
    string CustomerEmail,
    List<OrderItem> Items) : INotification;