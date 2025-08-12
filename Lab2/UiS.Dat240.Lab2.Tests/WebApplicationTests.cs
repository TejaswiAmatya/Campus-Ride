using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace UiS.Dat240.Lab2.Tests
{
    public class WebApplicationTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> factory;

        public WebApplicationTests(WebApplicationFactory<Program> factory)
        {
            // This is a way to mock the asp.net core server, and we use it 
            // to gain access to the DI container
            this.factory = factory;
        }

        [Fact]
        public void IFoodItemValidatorTests()
        {
            // itemValidator will be null if it is not registered in the DI container
            var itemValidator = factory.Services.GetService<IFoodItemValidator>();
            // Use "Assert...." to verify different scenarioes.
            // This will show up when running dotnet test when
            // standing in the test project directory.
            Assert.NotNull(itemValidator);
        }
    }
}