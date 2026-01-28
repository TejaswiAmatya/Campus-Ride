using Microsoft.Extensions.DependencyInjection;
using MediatR;
using FluentValidation;
using UiS.Dat240.Lab2.Api.Infrastructure;
using UiS.Dat240.Lab2.Api.Features.Products.Domain.Repositories;

namespace UiS.Dat240.Lab2.Api;

/// <summary>
/// This class sets up dependency injection for MediatR and FluentValidation.
/// You don't need to modify this file.
/// </summary>
public static class Program
{
    public static IServiceProvider ConfigureServices()
    {
        var services = new ServiceCollection();

        // Register MediatR
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));

        // Register FluentValidation validators
        services.AddValidatorsFromAssembly(typeof(Program).Assembly);

        // Register in-memory repository
        services.AddSingleton<IProductRepository, InMemoryProductRepository>();

        return services.BuildServiceProvider();
    }
}