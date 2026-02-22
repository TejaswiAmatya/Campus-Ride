using UiS.Dat240.Lab3.Api.Features.Orders.Domain.Entities;

namespace UiS.Dat240.Lab3.Api.Features.Orders.Domain.Repositories;

/// <summary>
/// Repository interface for Shipment entity.
/// An in-memory implementation is provided for testing.
/// </summary>
public interface IShipmentRepository
{
    Task<Shipment?> GetByOrderIdAsync(Guid orderId);
    Task<List<Shipment>> GetAllAsync();
    Task AddAsync(Shipment shipment);
}