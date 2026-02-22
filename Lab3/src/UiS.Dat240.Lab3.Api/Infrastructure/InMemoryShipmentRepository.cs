using UiS.Dat240.Lab3.Api.Features.Orders.Domain.Entities;
using UiS.Dat240.Lab3.Api.Features.Orders.Domain.Repositories;

namespace UiS.Dat240.Lab3.Api.Infrastructure;

/// <summary>
/// In-memory implementation of IShipmentRepository for testing.
/// This is provided for you - do not modify.
/// </summary>
public class InMemoryShipmentRepository : IShipmentRepository
{
    private readonly Dictionary<Guid, Shipment> _shipments = new();

    public Task<Shipment?> GetByOrderIdAsync(Guid orderId)
    {
        var shipment = _shipments.Values.FirstOrDefault(s => s.OrderId == orderId);
        return Task.FromResult(shipment);
    }

    public Task<List<Shipment>> GetAllAsync()
    {
        return Task.FromResult(_shipments.Values.ToList());
    }

    public Task AddAsync(Shipment shipment)
    {
        _shipments[shipment.ShipmentId] = shipment;
        return Task.CompletedTask;
    }
}