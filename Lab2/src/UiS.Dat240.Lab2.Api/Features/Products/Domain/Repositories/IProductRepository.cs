using UiS.Dat240.Lab2.Api.Features.Products.Domain.Entities;

namespace UiS.Dat240.Lab2.Api.Features.Products.Domain.Repositories;

/// <summary>
/// Repository interface for Product entity.
/// An in-memory implementation is provided for testing.
/// You should use this interface in your handlers.
/// </summary>
public interface IProductRepository
{
    Task<Product?> GetByIdAsync(Guid id);
    Task<Product?> GetBySkuAsync(string sku);
    Task<List<Product>> GetAllAsync();
    Task AddAsync(Product product);
    Task UpdateAsync(Product product);
    Task DeleteAsync(Guid id);
}