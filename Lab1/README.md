# Lab 1: Introduction to C#

* Deadline: 05.09.2024
* The lab has to be manually approved by the teaching assistants during lab hours.
  * The student is expected to explain the code during the manual approval.
    * An approval script is located at the end of the lab, which described the order we expect you to show your implementation in at lab approvals.
  * All code has to be submitted before the deadline, but can be approved in the first lab after the deadline.
  * It is possible to get the code approved before the deadline.

## Overview

Please go through the [signup process for QuickFeed](https://github.com/dat240-2025/info/blob/main/signup.md) before starting the lab.

### Summary

This is a short summary of the lab and you can find a more detailed explanation future down. The point of this lab is to get familiar with C# concepts like [types](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/), [classes](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/classes), [values](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-types), [interfaces](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/interfaces), [objects](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/object-oriented/objects), [loops](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/iteration-statements), [branching](https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/tutorials/branches-and-loops-local), and [generics](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/generics). We will also look into dependency injection since that is a concept heavily used in the next labs. The most important thing about this lab is to understand the concepts and basic building blocks of C# and .NET.

1. Install a terminal/command line interface if you do not have
2. Install git, .NET 8.0, Visual Studio Code
    1. Install recommended extensions from the repo
3. Create simple console program that reads and writes to the terminal
4. Create more complex console program that understands the `add`, `rem`, `size` and `exit` commands.
5. Run included test
6. Implementing a string version of an array based [Queue](https://en.wikipedia.org/wiki/Queue_(abstract_data_type)) in C#
   1. This should implement the `IStringQueue` [interface](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/interfaces)
   2. You are not allowed to use any other data structure the arrays for this lab. The entire point is to get to know C# and the base building blocks a little more.
7. Make a copy and create a object based queue storage system
   1. (This will use [C# type casting](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/types/casting-and-type-conversions))
   2. This should implement the `IObjectQueue` interface
8. Make a copy of the object version and make a [generic](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/generics) version of the queue
9. Create a command handlers that uses dependency injection for handling the different commands listed above. 


### Program flow

Below is the general program flow described. 

1. Print output
2. Read a string from the console
3. Split the string into command and data
4. Parse strings into other value types
5. Instantiate queue implementation
6. Insert elements
7. Take out elements
8. Implement the IEnumerable interface
9. Display an error if no more elements can be taken out
10. Dependency injection implementation

* The queue implementations should be based on a C# array.

### Prerequisite

To complete this lab, you would need:

* A command line program
  * Windows: Preferably powershell (already installed). 
    * A nice shell for powershell is [Windows Terminal](https://www.microsoft.com/nb-no/p/windows-terminal/9n0dx20hk701) (might be installed with windows) [Alternative link to windows terminal](https://github.com/microsoft/terminal)
  * Linux: A terminal is already installed.
  * Mac: A terminal is already installed. 
* git
  * Check if git is installed by running git in the command line with the command `git`
  * Basic instructions for installing git can be found [here](./Git.md)
* .NET 8.0 installed. Installation instructions can be found on this link [https://dotnet.microsoft.com/download/dotnet/8.0](https://dotnet.microsoft.com/download/dotnet/8.0).
  * Either install the latest **x64** 8.0.x version for your platform under **Build apps - SDK** → **Installers**.
  * Or use the [dotnet-install scripts](https://dotnet.microsoft.com/download/dotnet/scripts)
    * Install dotnet 8 with the command `.\dotnet-install 8.0`
    * For dotnet install script on windows then you might have to run the command `Set-ExecutionPolicy RemoteSigned` to enable script execution in PowerShell
* Visual Studio Code
  * (It is possible to use other code editors, but we cannot provide help for those).
  * Installation can be found here: [https://code.visualstudio.com/](https://code.visualstudio.com/)
    * As part of the windows VSCode installation it is recommended to check the two `Add "Open with code" action to Windows Explorer ...` options
* Recommended VSCode extensions
  * Please clone the assignments repository and open the assignments folder in VSCode.
  * VSCode will then prompt to install the recommended extensions.
  * Install the recommended extensions.
    * If this for some reason should not happen, then it is possible to find the list [here](../.vscode/extensions.json).

After the installation it could be a nice thing to log out and in again or just restart the computer.

### Useful links:

* [C# Tutorials for basic concepts https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/tutorials/](https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/tutorials/)

* Important for VSCode debugging https://docs.microsoft.com/en-us/dotnet/core/tutorials/debugging-with-visual-studio-code#set-up-for-terminal-input
* Using C# with Visual Studio Code [here](https://code.visualstudio.com/docs/languages/csharp)
* Learn C# [here](https://dotnet.microsoft.com/learn/csharp)
* Learn http status codes with http cats [here](https://http.cat/), (not useful for lab1)
* We could have a long list here but google is better at lists.

## Description

### Opening the lab in VSCode

To start this lab, please navigate to the Lab1 folder and open it in VSCode. If OmniSharp prompts you for which project to choose please select Lab1.sln. You can also go to `View -> Command Palette` (or the shortcut for it), and type `OmniSharp: select project` and verify that Lab1.sln is selected. This will be the same process for all the labs, you should always choose the .sln file for that lab.

There might by a description of the [folder structure](./FolderStructure.md) for Lab1.

It could also be useful to navigate to the folder where the csproj file is located and then run the command `dotnet restore`. This will ensure that all nuget packages are downloaded, so all code completion in Visual Studio Code should function correctly. You also might have to do this for the test project if you experience any errors like missing types or interfaces. 

### The lab

The lab already contains a C# console application in the Lab1/UiS.Dat240.Lab1 folder and can be started by navigating to the folder in the command line and writer `dotnet run`. You should then be greeted by the ubiquitous `Hello World!` code. The console app was generated by running the command: `dotnet new console`.

The code that greets us in the [program.cs](./UiS.Dat240.Lab1/Program.cs) file is the following:

```csharp
// TODO: Implement
Console.WriteLine("Hello World!");
```

And that is it. C# had a much more complicated setup before which can be found in the next part. This file is special since it does not specify a namespace and just have code. Only a single file can be written this way and all other files are required to have classes, interfaces, structs or records wrapped around them. We are also using implicit using statements here, even if `Console` is part of the `System` `namespace`, then we do not need to specify it, since System is imported by defaults in all files. More information about the [C# top level statements can be found here](https://docs.microsoft.com/en-us/dotnet/csharp/whats-new/tutorials/top-level-statements).

#### Old program.cs structure

The `program.cs` in all version before .NET 6 looked like the following. It is nice to know that for older C# code this is what it looked like, but with .NET 6 and newer we do not have to use this format any more.

```csharp
using System;
namespace UiS.Dat240.Lab1
{
    public class Program
    {
        static void Main(string[] args)
        {
           // TODO: Implement
           Console.WriteLine("Hello World!");
        }
    }
}
```

Here is a lot of code to do a simple thing, which is to write the string `Hello World!` to the console window. Currently it is the `Hello World` line that is interesting, which writes the lines to a console window. All you need to know for now is that `static void Main(string[] args)` is a main function which does not return anything (`void`), and expects to get a string array `string[] args` as input. The curly braces `{ }` defines a code body, and the `Main` function is the first thing that is executed in a C# program. The other things just need to be there for now and is mostly about naming things and telling the compiler what we want to use.

### Anatomy of a C# file

When we write that you should write a class, you can either write it directly inside the program.cs folder or preferably create a new file with the same name as the class/interface you intend to put into it, and have the code there. The only important thing is that all csharp files except the program.cs file should have a namespace declaration at the top, but after any using statements. like this:

```csharp
// Here goes using statements

namespace UiS.Dat240.Lab1;

// The rest of your code here like classes

public class MyClass
{
  
}
```

The full name of the MyClass will in this case be `UiS.Dat240.Lab1.MyClass`.

### Console input and output

The first things you can try to do with the code to get your feet wet are:
* Manipulate the string `"Hello World"`, 
* Add multiple `Console.WriteLine's`, 
* Try the `Console.Write` function instead of, which does not include the new line at the end of the output.

### Command line program

The first part of the lab should be to read an input from the user and react to what the user writes. The [Console.ReadLine](https://docs.microsoft.com/en-us/dotnet/api/system.console.readline) function can be used to read from a terminal window. After the input is read then it should be [split](https://docs.microsoft.com/en-us/dotnet/api/system.string.split) into a command part and a data part. The commands which should be implemented can be found in the table below. For now you only need to implement  a simple version of the logic for reading text from the command line and printing some output. You do not need to have the full implementation since that should be created later in the DependencyInjection part of this lab.

The command reading should read one command after another and only when the user types `exit` should the loop stop. `CTRL + C` and closing the terminal will also stop the program.

Before we have a real queue implementation it would be nice to test that the command handling is working correctly. This can be accomplished by writing the user input back to the console window. You can try and mimic the following behavior:

```text
> add Some test value
You wrote: "Some test value"
> rem
You wrote the remove command
> exit
```

We are also going to implement an more advanced and extendable version of the command handling later in the lab with the help of dependency injection.

### Commands:

| Command name | Description                                                         |
| ------------ | ------------------------------------------------------------------- |
| add {value}  | Adds the `{value}` to the queue                                     |
| rem          | Removes the first value from the queue and prints it to the console |
| size         | prints the number of items in the queue                             |
| exit         | Exits the command tool                                              |

### The test project

Let’s learn a little bit about testing our code in an automatic way. We have already prepared a test project which can run some simple test on the queue implementation. If you navigate to the [UiS.Dat240.Lab1/QueueTests.cs](./UiS.Dat240.Lab1.Tests/QueueTests.cs) file you will see three tests. We are using xunit to simplify testing of the code. 

If you have configured VSCode properly then there should be a codelens (The line between the [Fact] and the public void line which cannot be edited) that says something like `0 references | Run Test | Debug test`. If this line does not appear, try running the command `dotnet restore` from a terminal in the directory with the csproj for the test project. The `Run Test` and `Debug Test` is clickable and either starts the test in run mode or in debug mode. In debug mode break points will be hit and it is possible to inspect the code and figure out what the code is doing step by step. If this line is absent, either try to use [Google](https://www.google.com) or ask for help. A restart of the code editor/computer might also do the trick. 

It is also possible to execute the test via the command line. To do this navigate to the folder with the .csproj file and write `dotnet test`. This will run all the tests found the folder.

The nice thing about these tests, (which are [unit test](https://en.wikipedia.org/wiki/Unit_testing) in this case), is that you can take a part of some code and verify that it behaves the way you think without having to start the entire application. If we start to write the test at the same time as we write the implementation, then we are forced to write somewhat testable code. "Testable code" is maybe a little misleading in this case, since all code can be tested in some way, but a lot of code can be easy to write but hard to test since it has a lot of dependencies other places in the code. 

The easiest way to write a new test is to copy one of the tests and make some changes to it. One example is to insert two items in the queue instead of only one item and verify that the items are dequeued in the same order they are enqueued. Another test could be to verify that an exception is thrown by the code when the code tries to dequeue an element from an empty queue.

### Building a queue

The second part of the lab is implementing three different versions of a queue. The three queues are [IStringQueue](./UiS.Dat240.Lab1/Queues/IStringQueue.cs), [IObjectQueue](./UiS.Dat240.Lab1/Queues/IObjectQueue.cs) and finally [IGenericQueue<T>](./UiS.Dat240.Lab1/Queues/IGenericQueue.cs). You should first implement the IStringQueue, then the IObjectQueue and then the IGenericQueue. Since the only difference between these implementations is the types used, then after the string queue is implemented, then it should be fairly easy to make a copy and change out the types for the IObjectQueue and the IGenericQueue implementations.

The FIFO queue (First in First out) implementations should use a [C# Array](https://docs.microsoft.com/en-us/dotnet/api/system.array?view=net-5.0) as the data storage. C# arrays are fixed size which means the code must handle automatic growth of the array to accommodate more elements. [Dynamic Arrays](https://en.wikipedia.org/wiki/Dynamic_array) is the general concept for this, where you start with an array, and add elements to it. You would need different variables which keeps track of where the first and last elements in the queue are located. You could also make a more performant version which uses [Circular buffers](https://en.wikipedia.org/wiki/Circular_buffer) on top of Dynamic arrays/Array lists for keeping track of the elements.

**Only use arrays, integers, functions, loops and checks (like if and switch) for the internal of the queues. You should not use any other C# data structures like List<>, Queue<>, Dictionary<,> or others. You should not use anything from the System.Linq.* namespace for the queue implementation. This is to get to know the basic building blocks of C# without using more advanced features that C# and the .NET framework has to offer**

The queue should have the following functionality:

| Functionality   | Interface definition        | Description                                                                                                                                                                                                     |
| --------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enqueue(item)   | void Enqueue(string value); | Adds a value to the end of the queue                                                                                                                                                                            |
| Dequeue()       | string Dequeue();           | Returns the first element or throws an exception if the queue is empty                                                                                                                                          |
| Length { get; } | int Length { get; }         | Returns the number of elements in the queue as an integer                                                                                                                                                       |
| Grow()          | Not defined in interfaces   | When called it will create a new array of double the size as the old, copy all elements from the old array to the new array in the same order, then it should assign the new array as the working data storage. |

### IStringQueue

When creating the string queue, first create a class called something like `StringQueue` and then implement the interface `IStringQueue` as shown below. You could create all classes in the same file, but it is nice to create a new file for new classes to make thing easier to find. You can either create the file in the same folder as the program.cs file, or create a folder called Queues, and create the file there. In C# we use the `:` to implement interfaces and derive from other (base/super) classes.

```csharp
public class StringQueue : IStringQueue
{
  public int Length { get; }
  public void Enqueue(string value)
  {
    throw new NotImplementedException();
  }
  public string Dequeue()
  {
    throw new NotImplementedException();
  }
}
```

The main difference between the queues are the types used for storage. The first one can only store strings, but it might be easier to understand since string is a concrete implementation. This queue can also be used for the implementation of the command handling part of the program.

After the queue is created then navigate to the [TestSubmissions.cs](./UiS.Dat240.Lab1/TestSubmissions.cs) and modify the code so that it returns a new instance of your string queue implementation as shown below. 

#### Old
```csharp
public static IStringQueue CreateStringQueue()
{
    // TODO: Implement
    throw new NotImplementedException();
}
```
#### New
```csharp
public static IStringQueue CreateStringQueue()
{
    return new StringQueue();
}
```

Also remember to commit and push the changes so you know the QuickFeed score and have saved your work to GitHub. It is a good idea to commit and check the code with QuickFeed after each part of the lab.

### IObjectQueue

Since we already have created the string queue then it is much easier to create the object queue. Create a new class in a new file and copy the implementation from the string class and change the `string` types to `object` type instead. 

Now we are almost done, and one of the big benefit with using objects over strings is that we can store anything which can be [cast](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/types/casting-and-type-conversions) into an object, which in C#, is everything. The bad thing about this implementation is that we do not know what we have stored in the queue, since everything is stored as an object. We can also store `strings`, `ints` and anything else in the same queue instance, which can be hard to keep track of.

Do the same for the `ObjectQueue` as the `StringQueue` and add it to the [TestSubmissions.cs](./UiS.Dat240.Lab1/TestSubmissions.cs) file. This will be the same for each queue implementation.

### Clean up

Now we have two queue implementations which is almost the same and twice the amount of code to maintain! We also previously mentioned that the `ObjectQueue` can store anything, including strings, so why have two? The next part is creating an encapsulation class or wrapper class which implements the `IStringQueue` interface by using the `ObjectQueue` for storage instead of the code that we wrote for `StringQueue`.

* Change the existing `StringQueue` or create a new class, then create a field of type `ObjectQueue` and assigning an empty `ObjectQueue` to it. (`private ObjectQueue internalQueue = new ObjectQueue();`). 
* Change or reimplement the Enqueue, Dequeue and Size functions to call the `ObjectQueue` functions instead of the implementations we created for the `StringQueue` class.
* The Grow function can be deleted since that is handle by the `ObjectQueue`

One thing to note is that Enqueue is easy to implement, it is just calling the `ObjectQueue.Enqueue` function, but the Dequeue is harder. In C# all types are automatically (implicit) cast to a less specific type (for instance a base class or an interface). This means that since everything in C# is an object, then the string is implicitly cast to the object type. The other way around is not true since we do not know what the object really is. More information about casting can be found at the following links:
* https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/operators/type-testing-and-cast#cast-expression
* https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/types/boxing-and-unboxing
* https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/types/casting-and-type-conversions
* https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/conversions

Use the information in the links to cast the object back to a string before returning it from the dequeue function.

### The Generic Queue IGenericQueue&lt;T&gt;

The bad thing about the string implementation is that we must create a new queue implementation for each type we want to use, and the bad thing about the object queue is that we have no clue what is stored in the queue. So, the solution for this is making the C# compiler do all the hard work and create all the type specific versions for us. This is called [generics](https://docs.microsoft.com/en-us/dotnet/csharp/fundamentals/types/generics) and is about using a type variable (placeholder) instead of a concrete type. A type variable (placeholder) is much like a parameter in a function where we do not know the value given to the function, but in the case of generics, then we do not know the type. We almost always use the type variable `T` or a name with a `T` as a prefix ex. `TInput` to specify a type parameter. Generics is like creating a template for a `class`, `struct`, `record` or `Method`, where we decide when using the code what type it should be. 

Create a new class with a generic parameter `T` and implement the IGenericQueue&lt;T&gt; interface and copy the ObjectQueue code. Replace all object with T and we are done. Now we should do the same with GenericQueue that we did with ObjectQueue and replace the implementation of both the StringQueue and ObjectQueue to use the new implementation. As you would see, this is much simpler since we can just create a `GenericQueue<string>` for the string queue and `GenericQueue<object>` for the object queue, and then we do not need to cast anything!

### DependencyInjection based command engine

For this part of the lab we are going to implement a more advanced command handler for the command line. We are going to use DependencyInjection to accomplish a more pluggable architecture which should be easy to extend with new commands. It is possible to read more about [Dependency Injection in .NET here](https://docs.microsoft.com/en-us/dotnet/core/extensions/dependency-injection) and [some usage examples here](https://docs.microsoft.com/en-us/dotnet/core/extensions/dependency-injection-usage).

In contrast to the examples there, then we are not going to use a host builder but we are going to create and use the DI container directly. 

#### Creating a DI container and service provider

```csharp
// Example of functionality available to the DependencyInjection container

// Creating a new collection/list of recipes on how to create classes. 
var collection = new ServiceCollection(); // This is available in the Microsoft.Extensions.DependencyInjection namespace

// These are the only ones needed for lab 1
// Registering a class `Implementation` as an singleton in the ServiceCollection container 
// Singleton means that you get the same instance of a class no matter how many times you request it
collection.AddSingleton<Implementation>();
// Registering an interface `Interface` in the container, which uses the class `Implementation` to implement it
collection.AddSingleton<Interface, Implementation>();

// Same as above, but a new instance is created for each scope you create. 
collection.AddScoped<Implementation>();
collection.AddScoped<Interface, Implementation>(...);

// Same as above, but you get a new instance each time you call provider.GetService of the type you specified. 
// Meaning that if you register a list, you would get a new list each time, instead of singleton where the items 
// would be shared between everyone that requests them
collection.AddTransient<Implementation>();
collection.AddTransient<Interface, Implementation>();

// Create an IServiceProvider for the list of recipes, that you can ask to get the services from.
var provider = collection.BuildServiceProvider(true);

// Requesting a service from the ServiceProvider. 
var someValue = provider.GetService<Interface>();

// Requesting services from the dependency injection container:

// For 
collection.AddSingleton<Implementation>();
collection.AddScoped<Implementation>();
collection.AddTransient<Implementation>();

// Request it with
provider.GetService<Implementation>();

// For
collection.AddSingleton<Interface, Implementation>();
collection.AddScoped<Interface, Implementation>();
collection.AddTransient<Interface, Implementation>();

// Request them with
provider.GetService<Interface>();

// provider.GetService will either retrieve or create a new version of the class specified, using the configuration given as part of the Add*() functions.

// Also as part of an class constructor you can request services from DependencyInjection 
// as long as the class is also registered in dependency injection.

  // Registering all the different dependencies in the collection
collection.AddSingleton<SomeClass>(); 
collection.AddSingleton<HashSet<string>>();
collection.AddSingleton<ICollection<string>, List<string>>();

public class SomeClass
{
  private readonly ICollection<string> someList;
  private readonly HashSet<string> someList;
  
  // Requesting the different services from the dependency injection container via the constructor properties.
  public SomeClass(ICollection<string> someList, HashSet<string> hashSet)
  {
    this.someList = someList;
    this.hashSet = hashSet;
  }
}

// Then somewhere else you could request the following line, and all the constructor 
// arguments would be initialized for you, since all of them is registered in the DI container. 
// This command would first either create or retrieve a List<string> as part of the ICollection<string> parameter, then create or retrieve an HashSet<string>, then Create a SomeClass and give the two items to the constructor of SomeClass. It would then return the value and store it in someClass.

var someClass = provider.GetService<SomeClass>();
```

You are supposed to substitute `Implementation` with a class, and `Interface` with and interface implemented by the `Implementation` class.

It could be a good idea to create and configure the service collection inside the `TestSubmissions` class, where you are supposed to return it from the test. The you could call `TestSubmissions.CreateServiceProvider()` for the other places which require the service provider.

The different `Add...` commands on the ServiceCollection have different lifetimes, which means that for Singleton, you always get the same instance when calling `GetService` on that type, while transient returns a new instance each time. Scoped is a little bit special in that it returns the same service within a scope, but the scope has to be created from the service provider first. 

#### Implementation

To implement the command handler, we are going to create a small command classes which implements the interface `ICommandHandler`. An example of the AddHandler could be something like the following.

```csharp
// Example of setup of the AddHandler class
public class AddHandler : ICommandHandler
{
  // The name of the command
  public string Name => "add";

  private readonly IStringQueue stringQueue;
  // Since we are going to register the AddHandler in the dependency injection, 
  // then we can request other service from DI as constructor parameters.
  // This is the constructor of the class
  public AddHandler(IStringQueue stringQueue)
  {
    // The request service should also be stored and used later in the class
    this.stringQueue = stringQueue;
  }

  // The function to be executed when the user write the command name
  public void Handle(string args)
  {
    // Implement command handler functionality.
  }
}
```

One command handler should be created for each command specified in the table further up, with maybe the exception of the `exit` command. It is also important to register the queue implementations in the dependency injection so that the handlers can access the queue. The tests is also designed in a way that it expects to find all the different queue implementations in the DependencyInjection so remember to register all of them. For the generic `IGenericQueue` it expects to find an `IGenericQueue<string>`

The RemHandler should also handle the exception throw by the queue with a try catch, and write "queue is empty", if the user tries to remove an empty element from the queue.

The tests also expects the AddCommandHandler to only receive the part after the command name from the user input, an example would be that if the user writes `add some string`, then only `some string` should be given to CommandHandler `Handle` function.

#### Execution engine

For the execution of the commands we are going to use something similar to the following code: 

* Request all commands from the service provider with `provider.GetServices<ICommandHandler>()`
* In a loop
  * Write a preamble for the command line like `> ` or `cmd>` or something similar
  * Read some input from command line with `Console.ReadLine();`
  * Split the command on the first space, (it is useful here to use the overload which tells split how many items to return)
  * If the user writes `exit` then exit the loop, this could be implemented as a command, but that is a greater challenge.
  * Check all commands if it contains a command with the Name equal to the first part of the user input
    * If it is found, run the Handle function on the ICommandHandler with the rest of the user input
    * If it is not found, print an error that the command is not found.

#### Notes

DI is going to be used extensively in the next two labs and the project so it is a good idea to figure out how it works properly.

### IEnumerable

Since we now have some nice data structures, then it would be nice if we could look through them without having to dequeue and re enqueue all the different elements of the queue. It is possible to do that, but it would require a lot of processing. The way we are going to do this is by using the standard C# way of looking through data structures, which is the [foreach](https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/statements/iteration-statements#the-foreach-statement) way. As you also can read from the link is that the foreach statement work on a `type` (class, struct, record) that implements the [IEnumerable](https://docs.microsoft.com/en-us/dotnet/api/system.collections.ienumerable?view=net-5.0) interface or the generic version [IEnumerable<T>](https://docs.microsoft.com/en-us/dotnet/api/system.collections.generic.ienumerable-1?view=net-5.0) interfaces.

The `IEnumerable<T>` should be implemented for the class that implements the `IGenericQueue<T>` interface for the tests to pass, You should add the interface to the interface list for the queue class, and not add it to the interface list for the `IGenericQueue<T>` interface. A class can have several interfaces implemented at once, as well as an interface can derive from several interfaces. There are two ways of creating the enumerable code, where one of them is returning a [IEnumerator<T>](https://docs.microsoft.com/en-us/dotnet/api/system.collections.generic.ienumerator-1?view=net-5.0) which navigates through each element one by one, and there is the [yield return](https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/yield) method. Follow the examples on the links to implement the IEnumerable so the code can be used in a foreach statement. The yield way is probably easier to implement, since yield is making the compiler implement an IEnumerator for us which is nice.

### Approval script

1. Start the program with `dotnet run`
2. Run the following commands:
   1. `add bob`
   2. `add this message`
   3. `size`
      1. Should print 2
   4. `rem`
   5. `size`
      1. Should print 1
   6. `rem`
   7. `rem`
      1. Should print `queue is empty` and not crash
   8. `size`
      1. Should print 0
3. Explain the inner workings of the queue
4. Explain how you did dependency injection
5. Other things that the TA might ask about the code
