using UiS.Dat240.Lab3.Api.Features.Orders.Domain.Entities;
using UiS.Dat240.Lab3.Api.Features.Orders.Domain.Repositories;

namespace UiS.Dat240.Lab3.Api.Infrastructure;

/// <summary>
/// In-memory implementation of IOrderRepository for testing.
/// This is provided for you - do not modify.
/// </summary>
public class InMemoryOrderRepository : IOrderRepository
{
    private readonly Dictionary<Guid, Order> _orders = new();

    public Task<Order?> GetByIdAsync(Guid orderId)
    {
        _orders.TryGetValue(orderId, out var order);
        return Task.FromResult(order);
    }

    public Task<List<Order>> GetAllAsync()
    {
        return Task.FromResult(_orders.Values.ToList());
    }

    public Task AddAsync(Order order)
    {
        _orders[order.OrderId] = order;
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Order order)
    {
        if (_orders.ContainsKey(order.OrderId))
        {
            _orders[order.OrderId] = order;
        }
        return Task.CompletedTask;
    }
}