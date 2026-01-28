using UiS.Dat240.Lab2.Api.Features.Products.Domain.Entities;
using UiS.Dat240.Lab2.Api.Features.Products.Domain.Repositories;

namespace UiS.Dat240.Lab2.Api.Infrastructure;

/// <summary>
/// In-memory implementation of IProductRepository for testing.
/// This is provided for you - do not modify.
/// </summary>
public class InMemoryProductRepository : IProductRepository
{
    private readonly Dictionary<Guid, Product> _products = new();

    public Task<Product?> GetByIdAsync(Guid id)
    {
        _products.TryGetValue(id, out var product);
        return Task.FromResult(product);
    }

    public Task<Product?> GetBySkuAsync(string sku)
    {
        var product = _products.Values.FirstOrDefault(p => p.SKU == sku);
        return Task.FromResult(product);
    }

    public Task<List<Product>> GetAllAsync()
    {
        return Task.FromResult(_products.Values.ToList());
    }

    public Task AddAsync(Product product)
    {
        _products[product.Id] = product;
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Product product)
    {
        if (_products.ContainsKey(product.Id))
        {
            _products[product.Id] = product;
        }
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Guid id)
    {
        _products.Remove(id);
        return Task.CompletedTask;
    }
}