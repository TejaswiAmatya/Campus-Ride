namespace UiS.Dat240.Lab3.Api.Features.Orders.Domain.Entities;

/// <summary>
/// Represents a shipment for an order.
/// This entity is provided for you - do not modify.
/// </summary>
public class Shipment
{
    public Guid ShipmentId { get; set; }
    public Guid OrderId { get; set; }
    public DateTime CreatedAt { get; set; }
}