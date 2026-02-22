using MediatR;
using Microsoft.Extensions.DependencyInjection;
using NUnit.Framework;
using UiS.Dat240.Lab3.Api;
using UiS.Dat240.Lab3.Api.Features.Orders.Domain.Entities;
using UiS.Dat240.Lab3.Api.Features.Orders.Domain.Repositories;
using UiS.Dat240.Lab3.Api.Features.Orders;

namespace UiS.Dat240.Lab3.Tests.PublicTests;

[TestFixture]
public class EventHandlerTests
{
    private IMediator _mediator = null!;
    private IProductRepository _productRepository = null!;
    private IOrderRepository _orderRepository = null!;
    private IShipmentRepository _shipmentRepository = null!;

    [SetUp]
    public void Setup()
    {
        var serviceProvider = Program.ConfigureServices();
        _mediator = serviceProvider.GetRequiredService<IMediator>();
        _productRepository = serviceProvider.GetRequiredService<IProductRepository>();
        _orderRepository = serviceProvider.GetRequiredService<IOrderRepository>();
        _shipmentRepository = serviceProvider.GetRequiredService<IShipmentRepository>();
    }

    [Test]
    public async Task PlaceOrder_PublishesEvent_EmailHandlerExecutes()
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
        var order = await _orderRepository.GetByIdAsync(result.OrderId);
        Assert.That(order, Is.Not.Null);
        Assert.That(order!.ConfirmationEmailSent, Is.True, "Email handler should have set ConfirmationEmailSent to true");
    }

    [Test]
    public async Task PlaceOrder_PublishesEvent_InventoryHandlerReducesStock()
    {
        // Arrange
        var product = new Product { ProductId = Guid.NewGuid(), Name = "Test Product", Price = 29.99m, Stock = 100 };
        await _productRepository.AddAsync(product);

        var command = new PlaceOrder.Command(
            "customer@example.com",
            new List<OrderItemDto> { new(product.ProductId, 5) },
            "CreditCard"
        );

        // Act
        await _mediator.Send(command);

        // Assert
        var updatedProduct = await _productRepository.GetByIdAsync(product.ProductId);
        Assert.That(updatedProduct, Is.Not.Null);
        Assert.That(updatedProduct!.Stock, Is.EqualTo(95), "Inventory handler should have reduced stock by 5");
    }

    [Test]
    public async Task PlaceOrder_WithSufficientStock_CreatesShipment()
    {
        // Arrange
        var product = new Product { ProductId = Guid.NewGuid(), Name = "Test Product", Price = 29.99m, Stock = 100 };
        await _productRepository.AddAsync(product);

        var command = new PlaceOrder.Command(
            "customer@example.com",
            new List<OrderItemDto> { new(product.ProductId, 10) },
            "CreditCard"
        );

        // Act
        var result = await _mediator.Send(command);

        // Assert
        var order = await _orderRepository.GetByIdAsync(result.OrderId);
        var shipment = await _shipmentRepository.GetByOrderIdAsync(result.OrderId);

        Assert.That(order!.ShipmentCreated, Is.True, "Order should be marked as shipment created");
        Assert.That(shipment, Is.Not.Null, "Shipment should be created");
        Assert.That(shipment!.OrderId, Is.EqualTo(result.OrderId));
    }

    [Test]
    public async Task PlaceOrder_WithInsufficientStock_DoesNotCreateShipment()
    {
        // Arrange
        var product = new Product { ProductId = Guid.NewGuid(), Name = "Test Product", Price = 29.99m, Stock = 5 };
        await _productRepository.AddAsync(product);

        var command = new PlaceOrder.Command(
            "customer@example.com",
            new List<OrderItemDto> { new(product.ProductId, 10) }, // Ordering more than stock
            "CreditCard"
        );

        // Act
        var result = await _mediator.Send(command);

        // Assert
        var order = await _orderRepository.GetByIdAsync(result.OrderId);
        var shipment = await _shipmentRepository.GetByOrderIdAsync(result.OrderId);

        Assert.That(order!.ShipmentCreated, Is.False, "Order should NOT be marked as shipment created");
        Assert.That(shipment, Is.Null, "Shipment should NOT be created when stock is insufficient");
    }

    [Test]
    public async Task PlaceOrder_WithMultipleProducts_AllHandlersExecute()
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
            "PayPal"
        );

        // Act
        var result = await _mediator.Send(command);

        // Assert
        var order = await _orderRepository.GetByIdAsync(result.OrderId);
        var updatedProduct1 = await _productRepository.GetByIdAsync(product1.ProductId);
        var updatedProduct2 = await _productRepository.GetByIdAsync(product2.ProductId);

        Assert.That(order!.ConfirmationEmailSent, Is.True, "Email should be sent");
        Assert.That(updatedProduct1!.Stock, Is.EqualTo(47), "Product 1 stock should be reduced");
        Assert.That(updatedProduct2!.Stock, Is.EqualTo(25), "Product 2 stock should be reduced");
        Assert.That(order.ShipmentCreated, Is.True, "Shipment should be created");
    }
}