namespace UiS.Dat240.Lab1.Queues;

public interface IGenericQueue<T>
{
    int Length { get; }
    void Enqueue(T value);
    T Dequeue();
}
