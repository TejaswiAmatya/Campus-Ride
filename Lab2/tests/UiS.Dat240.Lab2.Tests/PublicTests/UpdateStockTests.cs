using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using NUnit.Framework;
using UiS.Dat240.Lab2.Api;
using UiS.Dat240.Lab2.Api.Features.Products;

namespace UiS.Dat240.Lab2.Tests.PublicTests;

[TestFixture]
public class UpdateStockTests
{
    private IMediator _mediator = null!;

    [SetUp]
    public void Setup()
    {
        var serviceProvider = Program.ConfigureServices();
        _mediator = serviceProvider.GetRequiredService<IMediator>();
    }

    [Test]
    public async Task UpdateStock_WithPositiveDelta_IncreasesStock()
    {
        // Arrange
        var createCommand = new CreateProduct.Command("Test Product", "ABC-1234", 29.99m, 100);
        var created = await _mediator.Send(createCommand);

        var updateCommand = new UpdateStock.Command(created.Id, 50);

        // Act
        var result = await _mediator.Send(updateCommand);

        // Assert
        Assert.That(result, Is.Not.Null);
        Assert.That(result.Stock, Is.EqualTo(150));
    }

    [Test]
    public async Task UpdateStock_WithNegativeDelta_DecreasesStock()
    {
        // Arrange
        var createCommand = new CreateProduct.Command("Test Product", "ABC-1234", 29.99m, 100);
        var created = await _mediator.Send(createCommand);

        var updateCommand = new UpdateStock.Command(created.Id, -30);

        // Act
        var result = await _mediator.Send(updateCommand);

        // Assert
        Assert.That(result, Is.Not.Null);
        Assert.That(result.Stock, Is.EqualTo(70));
    }

    [Test]
    public async Task UpdateStock_ResultingInNegativeStock_ThrowsException()
    {
        // Arrange
        var createCommand = new CreateProduct.Command("Test Product", "ABC-1234", 29.99m, 50);
        var created = await _mediator.Send(createCommand);

        var updateCommand = new UpdateStock.Command(created.Id, -100);

        // Assert
        Assert.ThrowsAsync<InvalidOperationException>(async () => await _mediator.Send(updateCommand));
    }

    [Test]
    public void UpdateStock_WithNonExistentProduct_ThrowsException()
    {
        // Arrange
        var updateCommand = new UpdateStock.Command(Guid.NewGuid(), 50);

        // Assert
        Assert.ThrowsAsync<KeyNotFoundException>(async () => await _mediator.Send(updateCommand));
    }

    [Test]
    public void UpdateStock_WithEmptyGuid_FailsValidation()
    {
        // Arrange
        var updateCommand = new UpdateStock.Command(Guid.Empty, 50);

        // Assert
        Assert.ThrowsAsync<ValidationException>(async () => await _mediator.Send(updateCommand));
    }
}