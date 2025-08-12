namespace UiS.Dat240.Lab1.Queues;

public interface IGenericPriorityQueue<T>
{
    int Length { get; }
    void Enqueue(int priority, T value);
    (int Priority, T Value) Dequeue();
}
