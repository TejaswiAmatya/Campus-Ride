using MediatR;
using UiS.Dat240.Lab3.Api.Features.Orders.Domain.Entities;
using UiS.Dat240.Lab3.Api.Features.Orders.Domain.Repositories;

namespace UiS.Dat240.Lab3.Api.Features.Orders.Events;

/// <summary>
/// Event Handler: Creates shipment when order is placed (if stock was sufficient)
/// 
/// TODO: Implement this handler to create shipment when possible
/// </summary>
// TODO: Make this class implement INotificationHandler<OrderPlaced>
public class CreateShipmentHandler
{
    // TODO: Inject IOrderRepository and IShipmentRepository in constructor

    // TODO: Implement Handle method
    // Steps:
    // 1. Get order from repository using notification.OrderId
    // 2. Check if order.HasSufficientStock is true
    // 3. If yes:
    //    a. Create new Shipment with ShipmentId = Guid.NewGuid(), OrderId, CreatedAt = DateTime.UtcNow
    //    b. Save shipment using AddAsync
    //    c. Set order.ShipmentCreated = true
    //    d. Update order in repository
    // 4. If no: Do nothing (don't create shipment)
    //
    // IMPORTANT: This handler reads HasSufficientStock flag set by the command handler
    // It does NOT check stock levels directly (avoiding race condition with UpdateInventoryHandler)
}