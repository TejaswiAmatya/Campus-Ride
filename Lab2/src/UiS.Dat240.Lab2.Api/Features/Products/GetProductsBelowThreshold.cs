using MediatR;
using FluentValidation;
using UiS.Dat240.Lab2.Api.Features.Products.Domain.Repositories;

namespace UiS.Dat240.Lab2.Api.Features.Products;

/// <summary>
/// Feature: Get all products where stock is below a threshold
/// 
/// TODO: Implement the following nested classes:
/// 1. Query record with property: Threshold
/// 2. Validator class that validates the Query
/// 3. Handler class that retrieves and filters products
/// 
/// Returns: List<ProductDto>
/// </summary>
public static class GetProductsBelowThreshold
{
    // TODO: Define Query record that implements IRequest<List<ProductDto>>
    // Property: int Threshold

    // TODO: Define Validator class that inherits AbstractValidator<Query>
    // Validation rules:
    // - Threshold: GreaterThan 0

    // TODO: Define Handler class that implements IRequestHandler<Query, List<ProductDto>>
    // Steps:
    // 1. Inject IProductRepository in constructor
    // 2. Get all products using GetAllAsync
    // 3. Filter products where Stock < Threshold
    // 4. Order by Stock ascending
    // 5. Map to List<ProductDto>
    // 6. Return the list (can be empty)
}