using UiS.Dat240.Lab3.Api.Features.Orders.Domain.Entities;

namespace UiS.Dat240.Lab3.Api.Features.Orders.Domain.Repositories;

/// <summary>
/// Repository interface for Order entity.
/// An in-memory implementation is provided for testing.
/// </summary>
public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(Guid orderId);
    Task<List<Order>> GetAllAsync();
    Task AddAsync(Order order);
    Task UpdateAsync(Order order);
}