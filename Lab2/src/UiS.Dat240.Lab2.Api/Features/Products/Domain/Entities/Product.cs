namespace UiS.Dat240.Lab2.Api.Features.Products.Domain.Entities;

/// <summary>
/// Represents a product in the inventory system.
/// This entity is provided for you - do not modify.
/// </summary>
public class Product
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Stock { get; set; }
}