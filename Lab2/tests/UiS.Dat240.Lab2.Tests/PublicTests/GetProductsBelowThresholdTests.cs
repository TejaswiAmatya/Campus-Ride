using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using NUnit.Framework;
using UiS.Dat240.Lab2.Api;
using UiS.Dat240.Lab2.Api.Features.Products;

namespace UiS.Dat240.Lab2.Tests.PublicTests;

[TestFixture]
public class GetProductsBelowThresholdTests
{
    private IMediator _mediator = null!;

    [SetUp]
    public void Setup()
    {
        var serviceProvider = Program.ConfigureServices();
        _mediator = serviceProvider.GetRequiredService<IMediator>();
    }

    [Test]
    public async Task GetProductsBelowThreshold_ReturnsProductsBelowThreshold()
    {
        // Arrange
        await _mediator.Send(new CreateProduct.Command("Product 1", "ABC-1234", 29.99m, 5));
        await _mediator.Send(new CreateProduct.Command("Product 2", "DEF-5678", 39.99m, 15));
        await _mediator.Send(new CreateProduct.Command("Product 3", "GHI-9012", 49.99m, 8));

        var query = new GetProductsBelowThreshold.Query(10);

        // Act
        var result = await _mediator.Send(query);

        // Assert
        Assert.That(result, Is.Not.Null);
        Assert.That(result.Count, Is.EqualTo(2));
        Assert.That(result[0].Stock, Is.EqualTo(5)); // Sorted by stock ascending
        Assert.That(result[1].Stock, Is.EqualTo(8));
    }

    [Test]
    public async Task GetProductsBelowThreshold_WhenNoProductsBelowThreshold_ReturnsEmptyList()
    {
        // Arrange
        await _mediator.Send(new CreateProduct.Command("Product 1", "ABC-1234", 29.99m, 50));
        await _mediator.Send(new CreateProduct.Command("Product 2", "DEF-5678", 39.99m, 60));

        var query = new GetProductsBelowThreshold.Query(10);

        // Act
        var result = await _mediator.Send(query);

        // Assert
        Assert.That(result, Is.Not.Null);
        Assert.That(result.Count, Is.EqualTo(0));
    }

    [Test]
    public async Task GetProductsBelowThreshold_SortsResultsByStockAscending()
    {
        // Arrange
        await _mediator.Send(new CreateProduct.Command("Product 1", "ABC-1234", 29.99m, 8));
        await _mediator.Send(new CreateProduct.Command("Product 2", "DEF-5678", 39.99m, 3));
        await _mediator.Send(new CreateProduct.Command("Product 3", "GHI-9012", 49.99m, 6));

        var query = new GetProductsBelowThreshold.Query(10);

        // Act
        var result = await _mediator.Send(query);

        // Assert
        Assert.That(result.Count, Is.EqualTo(3));
        Assert.That(result[0].Stock, Is.EqualTo(3));
        Assert.That(result[1].Stock, Is.EqualTo(6));
        Assert.That(result[2].Stock, Is.EqualTo(8));
    }

    [Test]
    public void GetProductsBelowThreshold_WithZeroThreshold_FailsValidation()
    {
        // Arrange
        var query = new GetProductsBelowThreshold.Query(0);

        // Assert
        Assert.ThrowsAsync<ValidationException>(async () => await _mediator.Send(query));
    }

    [Test]
    public void GetProductsBelowThreshold_WithNegativeThreshold_FailsValidation()
    {
        // Arrange
        var query = new GetProductsBelowThreshold.Query(-5);

        // Assert
        Assert.ThrowsAsync<ValidationException>(async () => await _mediator.Send(query));
    }
}