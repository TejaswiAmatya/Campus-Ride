using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using NUnit.Framework;
using UiS.Dat240.Lab2.Api;
using UiS.Dat240.Lab2.Api.Features.Products;

namespace UiS.Dat240.Lab2.Tests.PublicTests;

[TestFixture]
public class CreateProductTests
{
    private IMediator _mediator = null!;

    [SetUp]
    public void Setup()
    {
        var serviceProvider = Program.ConfigureServices();
        _mediator = serviceProvider.GetRequiredService<IMediator>();
    }

    [Test]
    public async Task CreateProduct_WithValidData_CreatesProduct()
    {
        // Arrange
        var command = new CreateProduct.Command("Test Product", "ABC-1234", 29.99m, 100);

        // Act
        var result = await _mediator.Send(command);

        // Assert
        Assert.That(result, Is.Not.Null);
        Assert.That(result.Name, Is.EqualTo("Test Product"));
        Assert.That(result.SKU, Is.EqualTo("ABC-1234"));
        Assert.That(result.Price, Is.EqualTo(29.99m));
        Assert.That(result.Stock, Is.EqualTo(100));
        Assert.That(result.Id, Is.Not.EqualTo(Guid.Empty));
    }

    [Test]
    public async Task CreateProduct_WithDuplicateSKU_ThrowsException()
    {
        // Arrange
        var command1 = new CreateProduct.Command("Product 1", "ABC-1234", 29.99m, 100);
        var command2 = new CreateProduct.Command("Product 2", "ABC-1234", 39.99m, 50);

        // Act
        await _mediator.Send(command1);

        // Assert
        Assert.ThrowsAsync<InvalidOperationException>(async () => await _mediator.Send(command2));
    }

    [Test]
    public void CreateProduct_WithEmptyName_FailsValidation()
    {
        // Arrange
        var command = new CreateProduct.Command("", "ABC-1234", 29.99m, 100);

        // Assert
        Assert.ThrowsAsync<ValidationException>(async () => await _mediator.Send(command));
    }

    [Test]
    public void CreateProduct_WithInvalidSKU_FailsValidation()
    {
        // Arrange
        var command = new CreateProduct.Command("Test Product", "invalid", 29.99m, 100);

        // Assert
        Assert.ThrowsAsync<ValidationException>(async () => await _mediator.Send(command));
    }

    [Test]
    public void CreateProduct_WithNegativePrice_FailsValidation()
    {
        // Arrange
        var command = new CreateProduct.Command("Test Product", "ABC-1234", -10m, 100);

        // Assert
        Assert.ThrowsAsync<ValidationException>(async () => await _mediator.Send(command));
    }

    [Test]
    public void CreateProduct_WithNegativeStock_FailsValidation()
    {
        // Arrange
        var command = new CreateProduct.Command("Test Product", "ABC-1234", 29.99m, -5);

        // Assert
        Assert.ThrowsAsync<ValidationException>(async () => await _mediator.Send(command));
    }
}