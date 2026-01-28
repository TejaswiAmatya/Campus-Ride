using MediatR;
using FluentValidation;
using UiS.Dat240.Lab2.Api.Features.Products.Domain.Repositories;

namespace UiS.Dat240.Lab2.Api.Features.Products;

/// <summary>
/// Feature: Update the stock level of a product
/// 
/// TODO: Implement the following nested classes:
/// 1. Command record with properties: ProductId, StockDelta
/// 2. Validator class that validates the Command
/// 3. Handler class that updates the product stock
/// 
/// Returns: ProductDto
/// </summary>
public static class UpdateStock
{
    // TODO: Define Command record that implements IRequest<ProductDto>
    // Properties: Guid ProductId, int StockDelta

    // TODO: Define Validator class that inherits AbstractValidator<Command>
    // Validation rules:
    // - ProductId: NotEmpty (not Guid.Empty)

    // TODO: Define Handler class that implements IRequestHandler<Command, ProductDto>
    // Steps:
    // 1. Inject IProductRepository in constructor
    // 2. Get product by ProductId using GetByIdAsync
    // 3. If product not found, throw KeyNotFoundException with meaningful message
    // 4. Calculate new stock: currentStock + StockDelta
    // 5. If new stock would be negative, throw InvalidOperationException with message
    // 6. Update product.Stock
    // 7. Save using UpdateAsync
    // 8. Return ProductDto with updated product data
}