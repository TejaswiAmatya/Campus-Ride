namespace UiS.Dat240.Lab3.Api.Features.Orders.Domain.Entities;

/// <summary>
/// Represents an order in the system.
/// This entity is provided for you - do not modify.
/// </summary>
public class Order
{
    public Guid OrderId { get; set; }
    public string CustomerEmail { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public List<OrderItem> Items { get; set; } = new();
    public bool ConfirmationEmailSent { get; set; }
    public bool ShipmentCreated { get; set; }
    public bool HasSufficientStock { get; set; }
}

/// <summary>
/// Represents an item within an order.
/// </summary>
public class OrderItem
{
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
}