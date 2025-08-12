using System;
using Xunit;

namespace UiS.Dat240.Lab1.Tests;

public class SimpleQueueTests
{
    [Fact]
    public void SimpleStringEnqueue()
    {
        var test = UiS.Dat240.Lab1.TestSubmissions.CreateStringQueue();
        var testValue = Guid.NewGuid().ToString();
        test.Enqueue(testValue);
        var newValue = test.Dequeue();
        Assert.Equal(testValue, newValue);
    }

    [Fact]
    public void SimpleObjectEnqueue()
    {
        var test = UiS.Dat240.Lab1.TestSubmissions.CreateObjectQueue();
        var testValue = Guid.NewGuid().ToString();
        test.Enqueue(testValue);
        var newValue = test.Dequeue();
        Assert.Equal(testValue, newValue);
    }

    [Fact]
    public void SimpleGenericEnqueue()
    {
        var test = UiS.Dat240.Lab1.TestSubmissions.CreateGenericQueue<string>();
        var testValue = Guid.NewGuid().ToString();
        test.Enqueue(testValue);
        var newValue = test.Dequeue();
        Assert.Equal(testValue, newValue);
    }
}
