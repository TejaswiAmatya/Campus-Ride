using MediatR;
using Microsoft.Extensions.DependencyInjection;
using NUnit.Framework;
using UiS.Dat240.Lab3.Api;
using UiS.Dat240.Lab3.Api.Features.Orders.Domain.Entities;
using UiS.Dat240.Lab3.Api.Features.Orders.Domain.Repositories;
using UiS.Dat240.Lab3.Api.Features.Orders;
using FluentValidation;

namespace UiS.Dat240.Lab3.Tests.PublicTests;

[TestFixture]
public class PlaceOrderTests
{
    private IMediator _mediator = null!;
    private IProductRepository _productRepository = null!;
    private IOrderRepository _orderRepository = null!;

    [SetUp]
    public void Setup()
    {
        var serviceProvider = Program.ConfigureServices();
        _mediator = serviceProvider.GetRequiredService<IMediator>();
        _productRepository = serviceProvider.GetRequiredService<IProductRepository>();
        _orderRepository = serviceProvider.GetRequiredService<IOrderRepository>();
    }

    [Test]
    public async Task PlaceOrder_WithValidData_CreatesOrder()
    {
        // Arrange
        var product = new Product { ProductId = Guid.NewGuid(), Name = "Test Product", Price = 29.99m, Stock = 100 };
        await _productRepository.AddAsync(product);

        var command = new PlaceOrder.Command(
            "customer@example.com",
            new List<OrderItemDto> { new(product.ProductId, 2) },
            "CreditCard"
        );

        // Act
        var result = await _mediator.Send(command);

        // Assert
        Assert.That(result, Is.Not.Null);
        Assert.That(result.CustomerEmail, Is.EqualTo("customer@example.com"));
        Assert.That(result.PaymentMethod, Is.EqualTo("CreditCard"));
        Assert.That(result.Items.Count, Is.EqualTo(1));
        Assert.That(result.OrderId, Is.Not.EqualTo(Guid.Empty));
    }

    [Test]
    public async Task PlaceOrder_WithMultipleItems_CreatesOrderWithAllItems()
    {
        // Arrange
        var product1 = new Product { ProductId = Guid.NewGuid(), Name = "Product 1", Price = 10m, Stock = 50 };
        var product2 = new Product { ProductId = Guid.NewGuid(), Name = "Product 2", Price = 20m, Stock = 30 };
        await _productRepository.AddAsync(product1);
        await _productRepository.AddAsync(product2);

        var command = new PlaceOrder.Command(
            "customer@example.com",
            new List<OrderItemDto>
            {
                new(product1.ProductId, 3),
                new(product2.ProductId, 5)
            },
            "DebitCard"
        );

        // Act
        var result = await _mediator.Send(command);

        // Assert
        Assert.That(result.Items.Count, Is.EqualTo(2));
    }

    [Test]
    public void PlaceOrder_WithInvalidEmail_FailsValidation()
    {
        // Arrange
        var command = new PlaceOrder.Command(
            "invalidemail",
            new List<OrderItemDto> { new(Guid.NewGuid(), 1) },
            "CreditCard"
        );

        // Assert
        Assert.ThrowsAsync<ValidationException>(async () => await _mediator.Send(command));
    }

    [Test]
    public void PlaceOrder_WithEmptyItems_FailsValidation()
    {
        // Arrange
        var command = new PlaceOrder.Command(
            "customer@example.com",
            new List<OrderItemDto>(),
            "CreditCard"
        );

        // Assert
        Assert.ThrowsAsync<ValidationException>(async () => await _mediator.Send(command));
    }

    [Test]
    public void PlaceOrder_WithZeroQuantity_FailsValidation()
    {
        // Arrange
        var command = new PlaceOrder.Command(
            "customer@example.com",
            new List<OrderItemDto> { new(Guid.NewGuid(), 0) },
            "CreditCard"
        );

        // Assert
        Assert.ThrowsAsync<ValidationException>(async () => await _mediator.Send(command));
    }

    [Test]
    public void PlaceOrder_WithInvalidPaymentMethod_FailsValidation()
    {
        // Arrange
        var command = new PlaceOrder.Command(
            "customer@example.com",
            new List<OrderItemDto> { new(Guid.NewGuid(), 1) },
            "Bitcoin"
        );

        // Assert
        Assert.ThrowsAsync<ValidationException>(async () => await _mediator.Send(command));
    }

    [Test]
    public void PlaceOrder_WithNonExistentProduct_ThrowsKeyNotFoundException()
    {
        // Arrange
        var command = new PlaceOrder.Command(
            "customer@example.com",
            new List<OrderItemDto> { new(Guid.NewGuid(), 1) },
            "CreditCard"
        );

        // Assert
        Assert.ThrowsAsync<KeyNotFoundException>(async () => await _mediator.Send(command));
    }
}