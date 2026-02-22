namespace UiS.Dat240.Lab3.Api.Features.Orders.Domain.Entities;

/// <summary>
/// Represents a product in the catalog.
/// This entity is provided for you - do not modify.
/// </summary>
public class Product
{
    public Guid ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Stock { get; set; }
}