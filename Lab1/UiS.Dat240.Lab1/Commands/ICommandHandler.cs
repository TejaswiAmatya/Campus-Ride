namespace UiS.Dat240.Lab1.Commands;

public interface ICommandHandler
{
    string Name { get; }
    void Handle(string args);
}
