using MediatR;
using UiS.Dat240.Lab3.Api.Features.Orders.Domain.Repositories;

namespace UiS.Dat240.Lab3.Api.Features.Orders.Events;

/// <summary>
/// Event Handler: Updates product inventory when order is placed
/// 
/// TODO: Implement this handler to reduce stock levels
/// </summary>
// TODO: Make this class implement INotificationHandler<OrderPlaced>
public class UpdateInventoryHandler
{
    // TODO: Inject IProductRepository in constructor

    // TODO: Implement Handle method
    // Steps:
    // 1. For each item in notification.Items:
    //    a. Get product from repository using item.ProductId
    //    b. Reduce product.Stock by item.Quantity
    //    c. Update product in repository using UpdateAsync
}