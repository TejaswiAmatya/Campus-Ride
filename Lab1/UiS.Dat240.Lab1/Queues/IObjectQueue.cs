namespace UiS.Dat240.Lab1.Queues;

public interface IObjectQueue
{
    int Length { get; }
    void Enqueue(object value);
    object Dequeue();
}
