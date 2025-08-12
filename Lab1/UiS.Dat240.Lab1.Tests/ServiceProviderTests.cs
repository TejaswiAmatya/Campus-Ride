using System;
using System.Linq;
using Microsoft.Extensions.DependencyInjection;
using UiS.Dat240.Lab1.Commands;
using Xunit;

namespace UiS.Dat240.Lab1.Tests;

public class ServiceProviderTests
{
    [Fact]
    public void SimpleServiceProviderTest()
    {
        var test = UiS.Dat240.Lab1.TestSubmissions.CreateServiceProvider();
        var handlers = test.GetServices<ICommandHandler>();

        var addCmd = handlers.FirstOrDefault(a => a.Name.Equals("add"));
        var remCmd = handlers.FirstOrDefault(a => a.Name.Equals("rem"));
        var sizeCmd = handlers.FirstOrDefault(a => a.Name.Equals("size"));

        Assert.NotNull(addCmd);
        Assert.NotNull(remCmd);
        Assert.NotNull(sizeCmd);
    }
}
