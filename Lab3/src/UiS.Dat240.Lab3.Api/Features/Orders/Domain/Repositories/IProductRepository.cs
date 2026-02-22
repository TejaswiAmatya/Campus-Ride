using UiS.Dat240.Lab3.Api.Features.Orders.Domain.Entities;

namespace UiS.Dat240.Lab3.Api.Features.Orders.Domain.Repositories;

/// <summary>
/// Repository interface for Product entity.
/// An in-memory implementation is provided for testing.
/// </summary>
public interface IProductRepository
{
    Task<Product?> GetByIdAsync(Guid productId);
    Task<List<Product>> GetAllAsync();
    Task AddAsync(Product product);
    Task UpdateAsync(Product product);
}