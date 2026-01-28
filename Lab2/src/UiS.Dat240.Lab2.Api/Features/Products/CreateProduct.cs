using MediatR;
using FluentValidation;
using UiS.Dat240.Lab2.Api.Features.Products.Domain.Entities;
using UiS.Dat240.Lab2.Api.Features.Products.Domain.Repositories;

namespace UiS.Dat240.Lab2.Api.Features.Products;

/// <summary>
/// Feature: Create a new product in the inventory
/// 
/// TODO: Implement the following nested classes:
/// 1. Command record with properties: Name, SKU, Price, Stock
/// 2. Validator class that validates the Command using FluentValidation
/// 3. Handler class that creates the product and saves it to the repository
/// 
/// Returns: ProductDto
/// </summary>
public static class CreateProduct
{
    // TODO: Define Command record that implements IRequest<ProductDto>
    // Properties: string Name, string SKU, decimal Price, int Stock

    // TODO: Define Validator class that inherits AbstractValidator<Command>
    // Validation rules:
    // - Name: NotEmpty, Length between 3 and 100
    // - SKU: NotEmpty, Matches pattern ^[A-Z]{3}-[0-9]{4}$
    // - Price: GreaterThan 0
    // - Stock: GreaterThanOrEqualTo 0

    // TODO: Define Handler class that implements IRequestHandler<Command, ProductDto>
    // Steps:
    // 1. Inject IProductRepository in constructor
    // 2. Check if SKU already exists (throw InvalidOperationException with message if it does)
    // 3. Create new Product with Guid.NewGuid() as Id
    // 4. Add product to repository using AddAsync
    // 5. Return ProductDto with product data
}

/// <summary>
/// Data Transfer Object for Product
/// This is provided for you - do not modify
/// </summary>
public record ProductDto(Guid Id, string Name, string SKU, decimal Price, int Stock);