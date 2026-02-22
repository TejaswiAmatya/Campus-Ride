using UiS.Dat240.Lab3.Api.Features.Orders.Domain.Entities;
using UiS.Dat240.Lab3.Api.Features.Orders.Domain.Repositories;

namespace UiS.Dat240.Lab3.Api.Infrastructure;

/// <summary>
/// In-memory implementation of IProductRepository for testing.
/// This is provided for you - do not modify.
/// </summary>
public class InMemoryProductRepository : IProductRepository
{
    private readonly Dictionary<Guid, Product> _products = new();

    public Task<Product?> GetByIdAsync(Guid productId)
    {
        _products.TryGetValue(productId, out var product);
        return Task.FromResult(product);
    }

    public Task<List<Product>> GetAllAsync()
    {
        return Task.FromResult(_products.Values.ToList());
    }

    public Task AddAsync(Product product)
    {
        _products[product.ProductId] = product;
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Product product)
    {
        if (_products.ContainsKey(product.ProductId))
        {
            _products[product.ProductId] = product;
        }
        return Task.CompletedTask;
    }
}