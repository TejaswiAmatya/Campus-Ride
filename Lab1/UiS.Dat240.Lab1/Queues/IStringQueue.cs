namespace UiS.Dat240.Lab1.Queues;

public interface IStringQueue
{
    int Length { get; }
    void Enqueue(string value);
    string Dequeue();
}
