using MediatR;
using UiS.Dat240.Lab3.Api.Features.Orders.Domain.Repositories;

namespace UiS.Dat240.Lab3.Api.Features.Orders.Events;

/// <summary>
/// Event Handler: Sends confirmation email when order is placed
/// 
/// TODO: Implement this handler to mark confirmation email as sent
/// </summary>
// TODO: Make this class implement INotificationHandler<OrderPlaced>
public class SendConfirmationEmailHandler
{
    // TODO: Inject IOrderRepository in constructor

    // TODO: Implement Handle method
    // Steps:
    // 1. Get order from repository using notification.OrderId
    // 2. Set order.ConfirmationEmailSent = true
    // 3. Update order in repository using UpdateAsync
}